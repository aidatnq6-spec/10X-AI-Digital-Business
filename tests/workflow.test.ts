import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir, hostname } from 'node:os'
import { join } from 'node:path'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { icaPreset } from '../src/lib/projects/ica-preset'
import { executeCommand } from '../src/lib/workflow/commands'
import { currentArtifacts, pendingGate } from '../src/lib/workflow/state-machine'
import { runOnce, claimNext, completeJob, recoverExpired } from '../src/lib/workflow/worker'
import { SampleProvider } from '../src/lib/ai/sample-provider'
import type { WorkflowCommand } from '../src/lib/workflow/commands'
const owner={id:randomUUID(),pid:process.pid,hostname:hostname()}
async function fixture(t:{after:(fn:()=>Promise<void>)=>void}){
 const root=await mkdtemp(join(tmpdir(),'mission-b-test-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const repo=new LocalProjectRepository(root);const p=await repo.create({name:'ICA',brief:icaPreset});return {repo,id:p.id}
}
type WithoutRequest<T>=T extends unknown?Omit<T,'requestId'>:never
const command=(repo:LocalProjectRepository,id:string,action:WithoutRequest<WorkflowCommand>)=>executeCommand(repo,id,{...action,requestId:randomUUID()} as WorkflowCommand)
async function approve(repo:LocalProjectRepository,id:string,gate:1|2){const p=await repo.get(id);return command(repo,id,{type:'approve',gate,briefVersion:p.briefVersion,artifactVersionIds:currentArtifacts(p).filter(a=>gate===1?a.systemId===1:[2,3].includes(a.systemId)).map(a=>a.id)})}

test('five stages stop at exactly two versioned approval gates; missing CTA must be removed or filled',async t=>{
 const {repo,id}=await fixture(t);const provider=new SampleProvider(0)
 const start={type:'start',requestId:randomUUID()} as const
 await executeCommand(repo,id,start);await executeCommand(repo,id,start)
 assert.equal((await repo.get(id)).jobs.length,1)
 await runOnce(repo,provider,owner);let p=await repo.get(id)
 assert.equal(pendingGate(p),1);assert.equal(await runOnce(repo,provider,owner),false)
 await approve(repo,id,1);await runOnce(repo,provider,owner);await runOnce(repo,provider,owner)
 p=await repo.get(id);assert.equal(pendingGate(p),2)
 assert.equal(currentArtifacts(p,2).length,4);assert.equal(currentArtifacts(p,3).length,8)
 await assert.rejects(()=>approve(repo,id,2),/liên hệ|bổ sung/i)
 await command(repo,id,{type:'useGenericCta'});await approve(repo,id,2)
 await runOnce(repo,provider,owner);await runOnce(repo,provider,owner)
 p=await repo.get(id);assert.equal(p.status,'completed');assert.equal(p.approvals.filter(a=>a.status==='valid').length,2)
 assert.equal(currentArtifacts(p,4).length,4);assert.equal(currentArtifacts(p,5).length,1)
 assert.match(currentArtifacts(p,1)[0].content,/1\.792\.800/)
 assert.equal(p.jobs.filter(j=>j.status==='completed').length,5)
})

test('an obsolete approval snapshot is rejected; editing a post preserves gate1 and invalidates only gate2/downstream',async t=>{
 const {repo,id}=await fixture(t);const provider=new SampleProvider(0)
 await command(repo,id,{type:'start'});await runOnce(repo,provider,owner);await approve(repo,id,1)
 await runOnce(repo,provider,owner);await runOnce(repo,provider,owner)
 let p=await repo.get(id);const before=currentArtifacts(p);const post=currentArtifacts(p,3)[0]
 await command(repo,id,{type:'reviseArtifact',artifactId:post.id,content:post.content+'\nNội dung đã sửa.'})
 p=await repo.get(id);assert.equal(p.status,'paused');assert.equal(p.approvals.filter(a=>a.gate===1&&a.status==='valid').length,1)
 assert.equal(currentArtifacts(p,2).length,4);assert.equal(currentArtifacts(p,3).length,8)
 await command(repo,id,{type:'resume'})
 await assert.rejects(()=>command(repo,id,{type:'approve',gate:2,briefVersion:p.briefVersion,artifactVersionIds:before.filter(a=>[2,3].includes(a.systemId)).map(a=>a.id)}),/phiên bản/i)
})

test('editing base facts while a provider is running makes the late output stale and pauses regeneration',async t=>{
 const {repo,id}=await fixture(t);await command(repo,id,{type:'start'})
 const claim=await claimNext(repo,owner);assert.ok(claim)
 let p=await repo.get(id)
 await command(repo,id,{type:'reviseBrief',expectedBriefVersion:p.briefVersion,brief:{...p.brief,offers:p.brief.offers.map(o=>({...o,priceVnd:o.priceVnd+1000}))}})
 const output=await new SampleProvider(0).generate(claim.job)
 await completeJob(repo,id,claim.job.id,owner.id,output)
 p=await repo.get(id);assert.equal(p.status,'paused');assert.equal(currentArtifacts(p).length,0)
 assert.ok(p.artifacts.every(a=>a.status==='stale'))
 await command(repo,id,{type:'resume'});await runOnce(repo,new SampleProvider(0),owner)
 p=await repo.get(id);assert.match(currentArtifacts(p,1)[0].content,/1\.793\.800/)
})

test('pause allows the in-flight checkpoint but does not schedule the next stage',async t=>{
 const {repo,id}=await fixture(t);await command(repo,id,{type:'start'});const claim=await claimNext(repo,owner);assert.ok(claim)
 await command(repo,id,{type:'pause'})
 await completeJob(repo,id,claim.job.id,owner.id,await new SampleProvider(0).generate(claim.job))
 assert.equal((await repo.get(id)).status,'paused');assert.equal(await runOnce(repo,new SampleProvider(0),owner),false)
 await command(repo,id,{type:'resume'});assert.equal(pendingGate(await repo.get(id)),1)
})

test('two workers claim once; expired dispatch is never automatically sent again',async t=>{
 const {repo,id}=await fixture(t);await command(repo,id,{type:'start'})
 const other={...owner,id:randomUUID()}
 const claims=await Promise.all([claimNext(repo,owner),claimNext(repo,other)])
 assert.equal(claims.filter(Boolean).length,1)
 await recoverExpired(repo,Date.now()+120000)
 let p=await repo.get(id);assert.equal(p.jobs[0].status,'needs_reconciliation');assert.equal(p.status,'failed')
 assert.equal(await runOnce(repo,new SampleProvider(0),other),false)
 await assert.rejects(()=>command(repo,id,{type:'resume'}),/đối chiếu/i)
 await command(repo,id,{type:'reconcileJob',jobId:p.jobs[0].id,decision:'retry'})
 await runOnce(repo,new SampleProvider(0),other)
 p=await repo.get(id);assert.equal(pendingGate(p),1);assert.equal(p.jobs.length,2)
})
test('editing a video invalidates conversion outputs that recorded that video as input',async t=>{
 const {repo,id}=await fixture(t),provider=new SampleProvider(0)
 await command(repo,id,{type:'start'});await runOnce(repo,provider,owner);await approve(repo,id,1)
 await runOnce(repo,provider,owner);await runOnce(repo,provider,owner)
 const p=await repo.get(id),video=currentArtifacts(p,2)[0]
 await command(repo,id,{type:'reviseArtifact',artifactId:video.id,content:video.content+'\nCảnh mới.'})
 const changed=await repo.get(id)
 assert.equal(currentArtifacts(changed,2).length,4)
 assert.equal(currentArtifacts(changed,3).length,0)
 assert.equal(changed.approvals.filter(a=>a.gate===1&&a.status==='valid').length,1)
 await command(repo,id,{type:'resume'});await runOnce(repo,provider,owner)
 assert.equal(pendingGate(await repo.get(id)),2)
})
