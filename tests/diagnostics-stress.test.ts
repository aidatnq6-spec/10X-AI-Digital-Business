import test,{mock} from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir,hostname } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { icaPreset } from '../src/lib/projects/ica-preset'
import { DiagnosticStore,diagnosticStep,reportDiagnostic } from '../src/lib/diagnostics/server'
import { workflowHandler } from '../src/lib/workflow/http'
import { executeCommand } from '../src/lib/workflow/commands'
import { runOnce } from '../src/lib/workflow/worker'
import { SampleProvider } from '../src/lib/ai/sample-provider'
const owner={id:randomUUID(),pid:process.pid,hostname:hostname()}
async function setup(t:any){const root=await mkdtemp(join(tmpdir(),'mc-diag-stress-'));t.after(()=>rm(root,{recursive:true,force:true}));const repo=new LocalProjectRepository(root),p=await repo.create({name:'Sample diagnostics',brief:icaPreset});return {root,repo,p}}
test('commit failure yields actionable500, preserves snapshot and same command can safely reconcile',async t=>{
 const {repo,p}=await setup(t),fs=require('node:fs/promises'),original=fs.rename,requestId=randomUUID(),handler=workflowHandler(repo)
 const rename=mock.method(fs,'rename',async(from:string,to:string)=>{if(String(to).endsWith('state.json'))throw Object.assign(new Error('secret path'),{code:'EPERM',syscall:'rename'});return original(from,to)});t.after(()=>rename.mock.restore())
 const request=()=>new Request(`http://127.0.0.1:3220/api/projects/${p.id}/commands`,{method:'POST',headers:{host:'127.0.0.1:3220',origin:'http://127.0.0.1:3220','content-type':'application/json'},body:JSON.stringify({type:'runStep',systemId:1,requestId})})
 const failed=await handler(request(),p.id),data=await failed.json()
 assert.equal(failed.status,500);assert.equal(data.code,'FS_EPERM');assert.equal(data.diagnostic.step,'repository.commit');assert.equal(data.diagnostic.systemId,1)
 assert.equal((await repo.get(p.id)).revision,p.revision)
 rename.mock.restore()
 assert.equal((await handler(request(),p.id)).status,200);assert.equal((await handler(request(),p.id)).status,200)
 assert.equal((await repo.get(p.id)).jobs.length,1)
})
test('worker provider failure records step and job without retrying generation',async t=>{
 const {repo,p}=await setup(t)
 await executeCommand(repo,p.id,{type:'runStep',systemId:1,requestId:randomUUID()})
 let calls=0
 await runOnce(repo,{generate:async()=>{calls++;throw Error('private prompt sk-secret')}},owner)
 const events=await new DiagnosticStore(repo.diagnosticsDirectory).list()
 assert.equal(events.length,1);assert.equal(events[0].step,'provider.generate');assert.equal(events[0].systemId,1);assert.equal(events[0].source,'worker');assert.ok(events[0].jobId)
 assert.equal(calls,1);assert.equal((await repo.get(p.id)).status,'failed');assert.match((await repo.get(p.id)).workflow.error!,new RegExp(events[0].id))
 await runOnce(repo,{generate:async()=>{calls++;throw Error()}},owner);assert.equal(calls,1)
})
test('concurrent approval, history and backup reads preserve committed state without unexpected500',async t=>{
 const {repo,p}=await setup(t),api=workflowHandler(repo),provider=new SampleProvider(0)
 await executeCommand(repo,p.id,{type:'runStep',systemId:1,requestId:randomUUID()});await runOnce(repo,provider,owner)
 const ready=await repo.get(p.id),ids=ready.artifacts.filter(a=>a.status!=='stale').map(a=>a.id)
 let stop=false;const failures:unknown[]=[]
 const readers=Array.from({length:3},async()=>{while(!stop){try{await repo.get(p.id);await repo.backups.list(p.id)}catch(e){failures.push(e)}await new Promise(r=>setTimeout(r,2))}})
 try{
  const results=await Promise.all(Array.from({length:12},()=>api(new Request(`http://127.0.0.1:3220/api/projects/${p.id}/commands`,{method:'POST',headers:{host:'127.0.0.1:3220',origin:'http://127.0.0.1:3220','content-type':'application/json'},body:JSON.stringify({type:'approve',gate:1,briefVersion:1,artifactVersionIds:ids,requestId:randomUUID()})}),p.id)))
  assert.ok(results.some(r=>r.status===200));assert.ok(results.every(r=>r.status===200||r.status===409))
 }finally{stop=true;await Promise.all(readers)}
 assert.equal(failures.length,0)
 assert.equal((await repo.get(p.id)).status,'paused')
 assert.equal((await new DiagnosticStore(repo.diagnosticsDirectory).list()).length,0)
})


test('post-commit release error is distinguished and retrying the same receipt cannot duplicate a job',async t=>{
 const {repo,p}=await setup(t),fs=require('node:fs/promises'),original=fs.unlink,handler=workflowHandler(repo),requestId=randomUUID()
 const unlink=mock.method(fs,'unlink',async(path:string)=>{if(String(path).endsWith('write.lock'))throw Object.assign(Error('private'),{code:'EPERM',syscall:'unlink'});return original(path)});t.after(()=>unlink.mock.restore())
 const req=()=>new Request(`http://127.0.0.1:3220/api/projects/${p.id}/commands`,{method:'POST',headers:{host:'127.0.0.1:3220',origin:'http://127.0.0.1:3220','content-type':'application/json'},body:JSON.stringify({type:'runStep',systemId:1,requestId})})
 const result=await handler(req(),p.id),data=await result.json()
 assert.equal(result.status,500);assert.equal(data.diagnostic.step,'repository.release');assert.equal(data.code,'FS_EPERM')
 assert.equal((await repo.get(p.id)).jobs.length,1)
 unlink.mock.restore()
 assert.equal((await handler(req(),p.id)).status,200);assert.equal((await repo.get(p.id)).jobs.length,1)
})
