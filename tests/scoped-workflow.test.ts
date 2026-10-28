import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { tmpdir,hostname } from 'node:os'
import { join } from 'node:path'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { executeCommand } from '../src/lib/workflow/commands'
import { icaPreset } from '../src/lib/projects/ica-preset'
import { SampleProvider } from '../src/lib/ai/sample-provider'
import { runOnce } from '../src/lib/workflow/worker'
import { currentArtifacts,approved,pendingGate } from '../src/lib/workflow/selectors'
import { ProviderError,zeroUsage } from '../src/lib/ai/provider'
const owner={id:randomUUID(),pid:process.pid,hostname:hostname()},provider=new SampleProvider(0)
async function setup(t:any){const root=await mkdtemp(join(tmpdir(),'mc-scope-'));t.after(()=>rm(root,{recursive:true,force:true}));const repo=new LocalProjectRepository(root);const p=await repo.create({name:'Scope',brief:{...icaPreset,contact:'0986000000'}});return {repo,id:p.id}}
const send=(repo:LocalProjectRepository,id:string,c:object)=>executeCommand(repo,id,{...c,requestId:randomUUID()})
async function approve(repo:LocalProjectRepository,id:string,gate:1|2){const p=await repo.get(id);return send(repo,id,{type:'approve',gate,briefVersion:p.briefVersion,artifactVersionIds:currentArtifacts(p).filter(a=>gate===1?a.systemId===1:[2,3].includes(a.systemId)).map(a=>a.id)})}
async function finish(repo:LocalProjectRepository,id:string){await send(repo,id,{type:'start'});await runOnce(repo,provider,owner);await approve(repo,id,1);await runOnce(repo,provider,owner);await runOnce(repo,provider,owner);await approve(repo,id,2);await runOnce(repo,provider,owner);await runOnce(repo,provider,owner)}
test('single-step runs stop after one step and approvals do not silently start another',async t=>{
 const {repo,id}=await setup(t)
 await assert.rejects(()=>send(repo,id,{type:'runStep',systemId:4}),/duyệt|bước/i)
 await send(repo,id,{type:'runStep',systemId:1});await runOnce(repo,provider,owner)
 assert.equal(pendingGate(await repo.get(id)),1)
 await approve(repo,id,1);assert.equal(await runOnce(repo,provider,owner),false)
 await send(repo,id,{type:'runStep',systemId:2});await runOnce(repo,provider,owner)
 let p=await repo.get(id);assert.equal(p.status,'paused');assert.equal(currentArtifacts(p,2).length,4);assert.equal(currentArtifacts(p,3).length,0)
 await assert.rejects(()=>send(repo,id,{type:'runStep',systemId:2}),/đủ|tạo lại/i)
 await send(repo,id,{type:'runChain'});await runOnce(repo,provider,owner)
 assert.equal(pendingGate(await repo.get(id)),2)
})
test('regenerating one approved post keeps unrelated approved versions and history; only one output is requested',async t=>{
 const {repo,id}=await setup(t);await finish(repo,id)
 const before=await repo.get(id),post=currentArtifacts(before,3).find(a=>a.key==='post:Facebook')!
 const retry={type:'regenerateArtifact',artifactId:post.id,requestId:randomUUID()}
 await executeCommand(repo,id,retry);await executeCommand(repo,id,retry)
 let pending=await repo.get(id)
 assert.equal(pending.jobs.filter(j=>j.status==='queued').length,1)
 assert.equal(currentArtifacts(pending,3).find(a=>a.id===post.id)?.status,'approved')
 let keys:string[]=[]
 await runOnce(repo,{generate:async job=>{keys=job.outputKeys!;return provider.generate(job)}},owner)
 const p=await repo.get(id),replacement=currentArtifacts(p,3).find(a=>a.key===post.key)!
 assert.deepEqual(keys,[post.key]);assert.notEqual(replacement.id,post.id);assert.equal(replacement.version,post.version+1)
 assert.equal(p.artifacts.find(a=>a.id===post.id)?.status,'stale');assert.equal(approved(p,1),true);assert.equal(approved(p,2),false)
 for(const a of currentArtifacts(before).filter(a=>[1,2,3].includes(a.systemId)&&a.id!==post.id)){assert.deepEqual(currentArtifacts(p).find(b=>b.id===a.id),a)}
 assert.equal(currentArtifacts(p,4).length,0);assert.equal(pendingGate(p),2)
 await approve(repo,id,2);assert.equal(await runOnce(repo,provider,owner),false)
})
test('failed regeneration preserves approvals and resume retries only that item',async t=>{
 const {repo,id}=await setup(t);await finish(repo,id)
 const before=await repo.get(id),item=currentArtifacts(before,2)[0]
 await send(repo,id,{type:'regenerateArtifact',artifactId:item.id})
 await assert.rejects(()=>send(repo,id,{type:'regenerateArtifact',artifactId:item.id}),/chạy|chờ/i)
 await runOnce(repo,{generate:async()=>{throw new ProviderError('Test failure',false,null,zeroUsage)}},owner)
 let p=await repo.get(id);assert.equal(approved(p,2),true);assert.deepEqual(currentArtifacts(p),currentArtifacts(before))
 await send(repo,id,{type:'resume'});await runOnce(repo,provider,owner)
 p=await repo.get(id);assert.equal(currentArtifacts(p,2).length,4);assert.equal(currentArtifacts(p,3).length,0);assert.equal(p.status,'paused')
 assert.equal(currentArtifacts(p,2).find(a=>a.key===item.key)?.version,item.version+1)
})

test('targeted regeneration finishing after a manual edit cannot replace the newer version',async t=>{
 const {repo,id}=await setup(t);await finish(repo,id)
 const post=currentArtifacts(await repo.get(id),3).find(a=>a.key==='post:Facebook')!
 await send(repo,id,{type:'regenerateArtifact',artifactId:post.id})
 let edited=false
 await runOnce(repo,{generate:async job=>{
  await send(repo,id,{type:'reviseArtifact',artifactId:post.id,content:'Bản sửa tay mới nhất'})
  edited=true
  return provider.generate(job)
 }},owner)
 const p=await repo.get(id)
 assert.equal(edited,true)
 assert.equal(currentArtifacts(p,3).find(a=>a.key===post.key)?.content,'Bản sửa tay mới nhất')
 assert.equal(p.artifacts.filter(a=>a.key===post.key&&a.status==='stale').length,2)
})
test('single-step live commands require cost consent and cannot bypass unknown charges',async t=>{
 const {repo,id}=await setup(t)
 const quote={id:'test/live',name:'Live test',promptPerToken:.000001,completionPerToken:.000002,contextLength:100000,maxCompletionTokens:20000,asOf:new Date().toISOString()}
 const services={models:async()=>[quote],key:()=> 'test'}
 const call=(c:object)=>executeCommand(repo,id,{...c,requestId:randomUUID()},services)
 await call({type:'configureAI',settings:{modelId:quote.id,maxCalls:8,maxInputTokens:64000,maxOutputTokens:12000,budgetUsd:1,acknowledgeCost:true}})
 await assert.rejects(()=>call({type:'runStep',systemId:1}),/chi phí/i)
 await call({type:'runStep',systemId:1,acknowledgeCost:true})
 await runOnce(repo,{generate:async()=>{throw new ProviderError('Unknown',true)}},owner)
 await assert.rejects(()=>call({type:'runChain',acknowledgeCost:true}),/đối chiếu/i)
 assert.equal((await repo.get(id)).jobs.length,1)
})

test('changing scope cancels only a paused unsent job before queuing the selected step',async t=>{
 const {repo,id}=await setup(t)
 await send(repo,id,{type:'start'});await send(repo,id,{type:'pause'})
 await send(repo,id,{type:'runStep',systemId:1})
 let p=await repo.get(id)
 assert.equal(p.jobs[0].status,'cancelled');assert.equal(p.jobs[1].status,'queued')
 await runOnce(repo,provider,owner)
 p=await repo.get(id);assert.equal(p.jobs.filter(j=>j.status==='completed').length,1);assert.equal(pendingGate(p),1)
})
test('generic CTA approval in step mode does not silently change to a chain run',async t=>{
 const {repo,id}=await setup(t)
 const initial=await repo.get(id)
 await send(repo,id,{type:'reviseBrief',expectedBriefVersion:initial.briefVersion,brief:{...initial.brief,contact:''}})
 await send(repo,id,{type:'runStep',systemId:1});await runOnce(repo,provider,owner);await approve(repo,id,1)
 await send(repo,id,{type:'runStep',systemId:2});await runOnce(repo,provider,owner)
 await send(repo,id,{type:'runStep',systemId:3});await runOnce(repo,provider,owner)
 await send(repo,id,{type:'useGenericCta'})
 assert.equal((await repo.get(id)).execution.scope,'step')
 await approve(repo,id,2)
 assert.equal(await runOnce(repo,provider,owner),false)
 assert.equal(currentArtifacts(await repo.get(id),4).length,0)
})
