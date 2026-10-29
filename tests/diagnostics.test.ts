import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm,mkdir,readFile,readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { DiagnosticStore,diagnosticContext,diagnosticStep,reportDiagnostic } from '../src/lib/diagnostics/server'
import { handle } from '../src/lib/projects/http'
import { diagnosticsHandler } from '../src/lib/diagnostics/http'
async function setup(t:any){const root=await mkdtemp(join(tmpdir(),'mc-diag-'));t.after(()=>rm(root,{recursive:true,force:true}));return {root,store:new DiagnosticStore(root)}}
test('500 references exact failing step and stores only allowlisted technical context',async t=>{
 const {root,store}=await setup(t),projectId=randomUUID()
 const response=await handle(async()=>diagnosticStep('repository.commit',async()=>{throw Object.assign(new Error('sk-secret private prompt C:/private/path'),{code:'EPERM',syscall:'rename',path:'secret'})}),{directory:root,operation:'workflow.command',projectId,systemId:3,command:'approve'})
 assert.equal(response.status,500);const data=await response.json()
 assert.equal(data.code,'FS_EPERM');assert.equal(data.diagnostic.step,'repository.commit');assert.equal(data.diagnostic.systemId,3)
 assert.ok(data.diagnostic.at);assert.match(data.diagnostic.id,/^[a-f0-9-]{36}$/)
 assert.equal(response.headers.get('x-diagnostic-id'),data.diagnostic.id)
 const entries=await store.list();assert.equal(entries.length,1);assert.equal(entries[0].id,data.diagnostic.id)
 const bytes=JSON.stringify(entries)+data.error+(await readFile(join(root,(await readdir(root))[0]),'utf8'))
 assert.doesNotMatch(bytes,/sk-secret|private prompt|private\/path|"stack"|"path"/)
})
test('concurrent contexts stay separate, retention is bounded and failures cannot mask original500',async t=>{
 const {root,store}=await setup(t)
 await Promise.all(Array.from({length:205},(_,i)=>diagnosticContext({directory:root,operation:'worker.job',systemId:i%5+1},()=>reportDiagnostic(Object.assign(new Error('hidden'),{code:'EIO'})))))
 const events=await store.list(200);assert.equal(events.length,200);assert.ok(events.every(e=>e.code==='FS_EIO'&&e.systemId!>=1&&e.systemId!<=5))
 const broken=join(root,'not-a-directory');await mkdir(broken);const {writeFile}=await import('node:fs/promises');await writeFile(join(broken,'file'),'x')
 const response=await handle(async()=>{throw Error('secret')},{directory:join(broken,'file'),operation:'project.get'})
 assert.equal(response.status,500);assert.equal((await response.json()).diagnostic.recorded,false)
})
test('diagnostics endpoint is readonly, local-only and does not accept filesystem paths',async t=>{
 const {root}=await setup(t),get=diagnosticsHandler(root)
 const req=(origin?:string)=>new Request('http://127.0.0.1:3220/api/diagnostics?path=C:/private',{headers:{host:'127.0.0.1:3220',...(origin?{origin}:{})}})
 assert.equal((await get(req('https://evil.example'))).status,403)
 assert.equal((await get(req())).status,200)
 const response=await handle(async()=>{throw Error('private')},{directory:root,operation:'project.get'})
 const id=(await response.json()).diagnostic.id
 const data=await (await get(req())).json();assert.equal(data.events[0].id,id)
})


test('sanitized wrapper retains filesystem cause code without recording its secret message',async t=>{
 const {root,store}=await setup(t)
 const {ProjectError}=await import('../src/lib/projects/repository')
 const response=await handle(async()=>{throw new ProjectError('CORRUPT','Không tạo được sao lưu.',Object.assign(Error('sk-secret path and prompt'),{code:'ENOSPC',syscall:'write'}))},{directory:root,operation:'backup',step:'backup.capture'})
 assert.equal(response.status,500);const data=await response.json();assert.equal(data.code,'FS_ENOSPC');assert.equal(data.diagnostic.step,'backup.capture')
 assert.doesNotMatch(JSON.stringify(await store.list())+data.error,/sk-secret|path and prompt/)
})
