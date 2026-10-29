import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID,createHash } from 'node:crypto'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { backupFileHandlers } from '../src/lib/projects/backup-files'
import { icaPreset } from '../src/lib/projects/ica-preset'
const base='http://127.0.0.1:3220'
const headers={host:'127.0.0.1:3220',origin:base,'content-type':'application/json'}
async function setup(t:any){const root=await mkdtemp(join(tmpdir(),'mc-files-'));t.after(()=>rm(root,{recursive:true,force:true}));const repo=new LocalProjectRepository(root);return {repo,api:backupFileHandlers(repo)}}
test('portable backup roundtrip to empty repository is paused, immutable and idempotent',async t=>{
 const a=await setup(t),b=await setup(t),p=await a.repo.create({name:'Portable',brief:icaPreset}),backup=(await a.repo.backups.list(p.id))[0]
 const exported=await a.api.GET(new Request(`${base}/api/backups/file?projectId=${p.id}&backupId=${backup.id}`,{headers}))
 assert.equal(exported.status,200);assert.match(exported.headers.get('content-disposition')!,/attachment/)
 const file=await exported.json(),requestId=randomUUID()
 const send=(value:unknown)=>b.api.POST(new Request(base+'/api/backups/file',{method:'POST',headers,body:JSON.stringify(value)}))
 assert.equal((await send({backup:file,requestId})).status,400)
 const input={backup:file,requestId,acknowledgeRestore:true},response=await send(input)
 assert.equal(response.status,201);const restored=(await response.json()).project
 assert.equal(restored.status,'paused');assert.equal(restored.aiConfig,null);assert.notEqual(restored.id,p.id);assert.deepEqual(restored.brief,p.brief)
 assert.equal((await send(input)).status,201);assert.equal((await b.repo.list()).length,1)
 const changed=structuredClone(file);changed.data.name='Different';changed.checksum=createHash('sha256').update(JSON.stringify(changed.data)).digest('hex')
 assert.equal((await send({...input,backup:changed})).status,409)
 assert.equal((await b.repo.backups.read(p.id,backup.id)).data.name,p.name)
})
test('rejects corrupt schema/checksum, foreign origin and oversized chunked JSON without writing',async t=>{
 const a=await setup(t),p=await a.repo.create({name:'Check',brief:icaPreset}),entry=(await a.repo.backups.list(p.id))[0],file=await a.repo.backups.read(p.id,entry.id),b=await setup(t)
 const send=(backup:unknown,origin=base)=>b.api.POST(new Request(base+'/api/backups/file',{method:'POST',headers:{...headers,origin},body:JSON.stringify({backup,requestId:randomUUID(),acknowledgeRestore:true})}))
 const corrupt=structuredClone(file);corrupt.data.name='Tampered'
 assert.equal((await send(corrupt)).status,400)
 assert.equal((await send({...file,formatVersion:2})).status,400)
 assert.equal((await send(file,'https://example.com')).status,403)
 let cancelled=false
 const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(1024*1024).fill(32))},cancel(){cancelled=true}})
 const response=await b.api.POST(new Request(base+'/api/backups/file',{method:'POST',headers,body:stream,duplex:'half'} as RequestInit))
 assert.equal(response.status,400);assert.equal(cancelled,true)
 assert.equal((await b.repo.backups.list()).length,0);assert.equal((await b.repo.list()).length,0)
})


test('normalized legacy backup exceeding storage limit is rejected before writing',async t=>{
 const a=await setup(t),p=await a.repo.create({name:'Legacy',brief:icaPreset}),entry=(await a.repo.backups.list(p.id))[0],b=await setup(t)
 const raw:any=await a.repo.backups.read(p.id,entry.id)
 delete raw.data.execution;delete raw.data.aiConfig;delete raw.data.workflow;delete raw.data.restoredFrom
 raw.data.commandReceipts=[{requestId:randomUUID(),payload:''}]
 raw.data.commandReceipts[0].payload='x'.repeat(32*1024*1024-1-Buffer.byteLength(JSON.stringify(raw)))
 raw.checksum=createHash('sha256').update(JSON.stringify(raw.data)).digest('hex')
 assert.ok(Buffer.byteLength(JSON.stringify(raw))<32*1024*1024)
 const response=await b.api.POST(new Request(base+'/api/backups/file',{method:'POST',headers,body:JSON.stringify({backup:raw,requestId:randomUUID(),acknowledgeRestore:true})}))
 assert.equal(response.status,400)
 assert.match((await response.json()).error,/32 MiB/)
 assert.equal((await b.repo.backups.list()).length,0);assert.equal((await b.repo.list()).length,0)
})
