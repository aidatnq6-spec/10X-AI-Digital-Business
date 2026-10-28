import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm,writeFile,readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { LocalProjectRepository } from '../src/lib/projects/local-repository'
import { backupHandlers } from '../src/lib/projects/backup-http'
import { icaPreset } from '../src/lib/projects/ica-preset'
const origin='http://127.0.0.1:3200'
const request=(data:unknown,site=origin)=>new Request(origin+'/api/backups',{method:'POST',headers:{'content-type':'application/json',origin:site,host:'127.0.0.1:3200'},body:JSON.stringify(data)})
test('backup API lists metadata only, rejects foreign origins and requires explicit restore acknowledgment',async t=>{
 const root=await mkdtemp(join(tmpdir(),'mc-backup-api-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const repo=new LocalProjectRepository(root),api=backupHandlers(repo),p=await repo.create({name:'Private backup',brief:icaPreset})
 const listed=await (await api.GET(new Request(origin+'/api/backups',{headers:{host:'127.0.0.1:3200'}}))).json()
 assert.equal(listed.backups.length,1);assert.equal(listed.backups[0].data,undefined)
 assert.equal(JSON.stringify(listed).includes(root),false)
 assert.equal((await api.POST(request({type:'create',projectId:p.id},'https://foreign.invalid'))).status,403)
 assert.equal((await api.POST(request({type:'restore',projectId:p.id,backupId:listed.backups[0].id,requestId:randomUUID()}))).status,400)
 const command={type:'restore',projectId:p.id,backupId:listed.backups[0].id,requestId:randomUUID(),acknowledgeRestore:true}
 const results=await Promise.all([api.POST(request(command)),api.POST(request(command))])
 assert.deepEqual(results.map(r=>r.status),[201,201])
 const values=await Promise.all(results.map(r=>r.json()))
 assert.equal(values[0].project.id,values[1].project.id);assert.equal((await repo.list()).length,2)
 assert.equal((await api.POST(request({type:'restore',projectId:'../secret',backupId:command.backupId,requestId:randomUUID(),acknowledgeRestore:true}))).status,400)
})
test('a failed backup cannot overwrite the last project snapshot',async t=>{
 const root=await mkdtemp(join(tmpdir(),'mc-backup-fail-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const repo=new LocalProjectRepository(root),p=await repo.create({name:'Safe',brief:icaPreset})
 const before=await readFile(join(root,p.id,'state.json'),'utf8')
 await rm(join(root,'.backups'),{recursive:true,force:true})
 await writeFile(join(root,'.backups'),'blocked')
 await assert.rejects(()=>repo.update(p.id,p.revision,x=>({...x,name:'Must not replace'})),/sao lưu/i)
 assert.equal(await readFile(join(root,p.id,'state.json'),'utf8'),before)
})
