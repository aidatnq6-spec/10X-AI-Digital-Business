import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm,readFile,writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { icaPreset } from '../src/lib/projects/ica-preset'
async function setup(t:any){const root=await mkdtemp(join(tmpdir(),'mc-backup-'));t.after(()=>rm(root,{recursive:true,force:true}));return {root,repo:new LocalProjectRepository(root)}}
test('automatic snapshots retain creation and changed data but ignore heartbeat-only writes',async t=>{
 const {repo}=await setup(t);const p=await repo.create({name:'ICA',brief:icaPreset})
 let backups=await repo.backups.list(p.id);assert.equal(backups.length,1)
 const next=await repo.update(p.id,p.revision,x=>({...x,name:'Tên mới'}))
 backups=await repo.backups.list(p.id);assert.equal(backups.length,2)
 await repo.update(p.id,next.revision,x=>x)
 assert.equal((await repo.backups.list(p.id)).length,2)
 assert.equal((await repo.backups.read(p.id,backups.find(b=>b.name==='ICA')!.id)).data.name,'ICA')
})
test('restore creates a paused copy, leaves original intact, keeps latest cost history and is idempotent',async t=>{
 const {root,repo}=await setup(t);const p=await repo.create({name:'Bản gốc',brief:icaPreset})
 const backup=(await repo.backups.list(p.id))[0]
 const next=await repo.update(p.id,p.revision,x=>({...x,name:'Đang làm',jobs:[{id:randomUUID(),systemId:1,briefVersion:1,workflowEpoch:1,idempotencyKey:'paid',status:'failed',providerRequestId:null,usage:{status:'actual',inputTokens:1,outputTokens:1,costUsd:.12},mode:'openrouter',configSnapshot:null,reservedCostUsd:0,sentAt:new Date().toISOString(),inputBrief:null,inputArtifacts:[],ownerId:null,ownerPid:null,ownerHost:null,leaseUntil:null,startedAt:null,finishedAt:null,error:null,outputKeys:null,replaceArtifactId:null}]}))
 const bytes=await readFile(join(root,p.id,'state.json'),'utf8'),requestId=randomUUID()
 const restored=await repo.restoreBackup(p.id,backup.id,requestId)
 assert.notEqual(restored.id,p.id);assert.equal(restored.status,'paused');assert.equal(restored.aiConfig,null)
 assert.equal(restored.name,'Bản gốc · Khôi phục');assert.equal(restored.jobs[0].usage?.costUsd,.12)
 assert.deepEqual(restored.brief,p.brief);assert.equal(restored.restoredFrom?.backupId,backup.id)
 assert.equal(await readFile(join(root,p.id,'state.json'),'utf8'),bytes)
 assert.equal((await repo.restoreBackup(p.id,backup.id,requestId)).id,restored.id)
 assert.equal((await repo.list()).length,2)
 assert.equal((await repo.backups.list(p.id)).some(b=>b.reason==='before-restore'),true)
 assert.equal((await repo.get(next.id)).name,'Đang làm')
})
test('corrupt backups cannot restore; a corrupt original remains untouched while a verified backup can recover',async t=>{
 const {root,repo}=await setup(t);const p=await repo.create({name:'ICA',brief:icaPreset})
 const backup=(await repo.backups.list(p.id))[0]
 await writeFile(join(root,p.id,'state.json'),'{broken original')
 const restored=await repo.restoreBackup(p.id,backup.id,randomUUID())
 assert.equal(restored.brief.product,icaPreset.product)
 assert.equal(await readFile(join(root,p.id,'state.json'),'utf8'),'{broken original')
 assert.equal((await repo.list()).some(x=>x.id===restored.id),true)
 assert.deepEqual((await repo.unreadableProjects()),[p.id])
 const path=join(root,'.backups',p.id,backup.id+'.json')
 const data=JSON.parse(await readFile(path,'utf8'));data.data.name='Changed without checksum';await writeFile(path,JSON.stringify(data))
 await assert.rejects(()=>repo.restoreBackup(p.id,backup.id,randomUUID()),/sao lưu|toàn vẹn/i)
 assert.equal((await repo.backups.list(p.id)).find(b=>b.id===backup.id)?.valid,false)
})
test('retention is bounded and traversal or restoring while a job is running is rejected',async t=>{
 const {repo}=await setup(t);let p=await repo.create({name:'ICA',brief:icaPreset})
 for(let i=0;i<33;i++)p=await repo.update(p.id,p.revision,x=>({...x,name:'ICA '+i}))
 assert.equal((await repo.backups.list(p.id)).length,30)
 await assert.rejects(()=>repo.backups.read('../secret',randomUUID()))
 await assert.rejects(()=>repo.backups.read(p.id,'../../.env.local'))
 const backup=(await repo.backups.list(p.id))[0]
 p=await repo.update(p.id,p.revision,x=>({...x,status:'running',jobs:[{...x.jobs[0],id:randomUUID(),systemId:1,briefVersion:1,workflowEpoch:1,idempotencyKey:'running',status:'running',providerRequestId:null,usage:null} as any]}))
 await assert.rejects(()=>repo.restoreBackup(p.id,backup.id,randomUUID()),/chạy|đối chiếu/i)
})

test('backup metadata failure does not invalidate an already verified snapshot or block saving',async t=>{
 const {root,repo}=await setup(t);const p=await repo.create({name:'Stable',brief:icaPreset})
 const {mkdir}=await import('node:fs/promises')
 await rm(join(root,'.backups','health.json'),{force:true})
 await mkdir(join(root,'.backups','health.json'))
 await rm(join(root,'.backups',p.id,'latest.json'),{force:true})
 await mkdir(join(root,'.backups',p.id,'latest.json'))
 const next=await repo.update(p.id,p.revision,x=>({...x,name:'Protected'}))
 assert.equal(next.name,'Protected')
 assert.equal((await repo.backups.list(p.id)).some(b=>b.valid&&b.name==='Protected'),true)
})
