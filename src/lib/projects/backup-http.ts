import { z } from 'zod'
import { handle,json,body } from './http'
import { assertLocalAccess } from '../server/local-access'
import type { LocalProjectRepository } from './local-repository'
const command=z.discriminatedUnion('type',[
 z.object({type:z.literal('create'),projectId:z.uuid()}).strict(),
 z.object({type:z.literal('restore'),projectId:z.uuid(),backupId:z.uuid(),requestId:z.uuid(),acknowledgeRestore:z.literal(true)}).strict(),
])
export function backupHandlers(repo:LocalProjectRepository){
 return {
  GET:(request:Request)=>handle(async()=>{assertLocalAccess(request);return json({backups:await repo.backups.list(),health:await repo.backups.health(),unreadableProjects:await repo.unreadableProjects()})},{directory:repo.diagnosticsDirectory,operation:'backup'}),
  POST:(request:Request)=>handle(async()=>{
   assertLocalAccess(request,true)
   const input=command.parse(await body(request))
   if(input.type==='create'){
    const project=await repo.get(input.projectId)
    const id=await repo.backups.capture(project,'manual')
    return json({backupId:id})
   }
   return json({project:await repo.restoreBackup(input.projectId,input.backupId,input.requestId)},201)
  },{directory:repo.diagnosticsDirectory,operation:'backup'}),
 }
}
