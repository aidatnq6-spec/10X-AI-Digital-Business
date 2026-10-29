import { z } from 'zod'
import { backupEnvelope,validateBackupEnvelope } from './backup-store'
import { body,handle,json } from './http'
import { assertLocalAccess } from '../server/local-access'
import type { LocalProjectRepository } from './local-repository'
const command=z.object({backup:z.unknown(),requestId:z.uuid(),acknowledgeRestore:z.literal(true)}).strict()
export function backupFileHandlers(repo:LocalProjectRepository){return {
 GET:(request:Request)=>handle(async()=>{
  assertLocalAccess(request)
  const q=new URL(request.url).searchParams
  const ids=z.object({projectId:z.uuid(),backupId:z.uuid()}).parse({projectId:q.get('projectId'),backupId:q.get('backupId')})
  const saved=await repo.backups.read(ids.projectId,ids.backupId)
  const response=json(backupEnvelope(saved))
  response.headers.set('Content-Disposition',`attachment; filename="10x-backup-${saved.id}.json"`)
  return response
 },{directory:repo.diagnosticsDirectory,operation:'backup'}),
 POST:(request:Request)=>handle(async()=>{
  assertLocalAccess(request,true)
  const input=command.parse(await body(request,32*1024*1024+1024))
  // Validation precedes every filesystem write; checksum uses exact incoming data.
  const saved=validateBackupEnvelope(input.backup)
  if(Math.max(Buffer.byteLength(JSON.stringify(input.backup),'utf8'),Buffer.byteLength(JSON.stringify(backupEnvelope(saved)),'utf8'))>32*1024*1024)return json({error:'Tệp sao lưu vượt quá 32 MiB.'},400)
  await repo.backups.importFile(saved)
  return json({project:await repo.restoreBackup(saved.projectId,saved.id,input.requestId)},201)
 },{directory:repo.diagnosticsDirectory,operation:'backup'}),
}}
