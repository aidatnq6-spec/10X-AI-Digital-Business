import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn,type ChildProcess } from 'node:child_process'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { icaPreset } from '../src/lib/projects/ica-preset'
import { executeCommand } from '../src/lib/workflow/commands'
import { currentArtifacts } from '../src/lib/workflow/selectors'
async function freePort(){const s=createServer();await new Promise<void>(r=>s.listen(0,'127.0.0.1',r));const port=(s.address() as {port:number}).port;await new Promise<void>(r=>s.close(()=>r()));return port}
async function until(check:()=>Promise<boolean>){const until=Date.now()+15000;while(Date.now()<until){if(await check())return;await new Promise(r=>setTimeout(r,100))}throw new Error('Worker test timed out')}
async function stop(child:ChildProcess){if(child.exitCode!==null||child.signalCode!==null)return;await new Promise<void>(resolve=>{child.once('exit',()=>resolve());child.kill()})}
test('a real worker process resumes queued work after restart using the same persisted checkpoint',async t=>{
 const root=await mkdtemp(join(tmpdir(),'mission-worker-test-')),children:ChildProcess[]=[]
 t.after(async()=>{for(const child of children)await stop(child);assert.ok(root.startsWith(tmpdir()));await rm(root,{recursive:true,force:true})})
 const port=await freePort(),repo=new LocalProjectRepository(root)
 const project=await repo.create({name:'ICA restart',brief:icaPreset})
 await executeCommand(repo,project.id,{type:'start',requestId:randomUUID()})
 const start=()=>{const child=spawn(process.execPath,['--import','tsx','scripts/worker.ts'],{cwd:process.cwd(),windowsHide:true,stdio:'ignore',env:{...process.env,MISSION_CONTROL_DATA_DIR:root,MISSION_CONTROL_WORKER_PORT:String(port)}});children.push(child);return child}
 const first=start();await until(async()=>(await repo.get(project.id)).status==='waiting_approval')
 await stop(first)
 let p=await repo.get(project.id)
 assert.equal(p.workflow.gate,1)
 await executeCommand(repo,p.id,{type:'approve',gate:1,briefVersion:p.briefVersion,artifactVersionIds:currentArtifacts(p,1).map(a=>a.id),requestId:randomUUID()})
 const second=start();await until(async()=>{const p=await repo.get(project.id);return p.status==='waiting_approval'&&p.workflow.gate===2})
 await stop(second);p=await repo.get(project.id)
 assert.equal(p.jobs.length,3);assert.equal(p.jobs.every(j=>j.status==='completed'),true)
 assert.equal(p.approvals.filter(a=>a.status==='valid').length,1)
})