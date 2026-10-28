import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir,hostname } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { icaPreset } from '../src/lib/projects/ica-preset'
import { executeCommand } from '../src/lib/workflow/commands'
import { currentArtifacts } from '../src/lib/workflow/selectors'
import { runOnce } from '../src/lib/workflow/worker'
import { SampleProvider } from '../src/lib/ai/sample-provider'
import { exportText } from '../src/lib/export/text'
import { exportHandler } from '../src/lib/export/http'
test('ICA full flow passes exactly two gates and exports 18 versioned text artifacts plus a blank CSV',async t=>{
 const root=await mkdtemp(join(tmpdir(),'mc-full-d-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const repo=new LocalProjectRepository(root),initial=await repo.create({name:'ICA Mốc D',brief:{...icaPreset,contact:'0986000000'}})
 const id=initial.id,send=(c:object)=>executeCommand(repo,id,{...c,requestId:randomUUID()}),owner={id:randomUUID(),pid:process.pid,hostname:hostname()},sample=new SampleProvider(0)
 let calls=0
 const provider={generate:async(job:any)=>{calls++;return sample.generate(job)}}
 const run=()=>runOnce(repo,provider,owner)
 async function approve(gate:1|2){const p=await repo.get(id);await send({type:'approve',gate,briefVersion:p.briefVersion,artifactVersionIds:currentArtifacts(p).filter(a=>gate===1?a.systemId===1:[2,3].includes(a.systemId)).map(a=>a.id)})}
 await send({type:'start'});await run();assert.equal(await run(),false);assert.equal(calls,1)
 await approve(1);await run();await run();assert.equal(await run(),false);assert.equal(calls,3)
 await approve(2);await run();await run()
 const p=await repo.get(id)
 assert.equal(p.status,'completed');assert.equal(calls,5);assert.equal(p.approvals.filter(a=>a.status==='valid').length,2);assert.equal(currentArtifacts(p).length,18)
 const text=exportText(p)
 assert.equal((text.match(/Nguồn: Mẫu/g)??[]).length,18);assert.match(text,/không phải tệp video MP4/)
 assert.match(text,/1\.792\.800/);assert.match(text,/2\.690\.000/);assert.match(text,/3\.080\.000/);assert.match(text,/tặng thêm 6 tháng/)
 assert.match(text,/đúng bộ phiên bản hiện hành/)
 const post=currentArtifacts(p,3).find(a=>a.kind==='social-post')!
 await send({type:'reviseArtifact',artifactId:post.id,content:post.content+'\nĐã sửa'})
 const changed=await repo.get(id)
 assert.match(exportText(changed),/Đã duyệt trước đây · bộ hiện tại cần duyệt lại/)
 const handler=exportHandler(repo),request=(q:string)=>new Request('http://127.0.0.1:3200/api/projects/'+id+'/export?'+q,{headers:{host:'127.0.0.1:3200'}})
 assert.equal((await handler(request('format=txt&briefVersion=1&artifactId='+post.id),id)).status,409)
 const csv=await handler(request('format=csv&briefVersion=1'),id)
 assert.equal(csv.status,200);const bytes=new Uint8Array(await csv.arrayBuffer());assert.deepEqual([...bytes.slice(0,3)],[239,187,191])
 await send({type:'reviseBrief',expectedBriefVersion:changed.briefVersion,brief:{...changed.brief,offers:changed.brief.offers.map(o=>({...o,priceVnd:o.priceVnd+1000}))}})
 assert.equal((await handler(request('format=txt&briefVersion=1'),id)).status,409)
 assert.equal(currentArtifacts(await repo.get(id)).length,0)
 assert.equal(calls,5)
})
