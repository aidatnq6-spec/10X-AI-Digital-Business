import { assertLocalAccess } from '../server/local-access'
import { body,handle,json } from '../projects/http'
import type { ProjectRepository } from '../projects/repository'
import { executeCommand } from './commands'
export function workflowHandler(repo:ProjectRepository){return (request:Request,id:string)=>handle(async()=>{
 assertLocalAccess(request,true)
 return json({project:await executeCommand(repo,id,await body(request))})
})}