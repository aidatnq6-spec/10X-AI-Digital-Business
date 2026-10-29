import { diagnosticContext } from '../diagnostics/server'
import { assertLocalAccess } from '../server/local-access'
import { body,handle,json } from '../projects/http'
import type { ProjectRepository } from '../projects/repository'
import { executeCommand } from './commands'
export function workflowHandler(repo:ProjectRepository){return (request:Request,id:string)=>handle(async()=>{
 assertLocalAccess(request,true)
 const input=await body(request),c=input as {type?:unknown;systemId?:unknown;gate?:unknown}
 return diagnosticContext({command:typeof c?.type==='string'?c.type:undefined,systemId:typeof c?.systemId==='number'?c.systemId:undefined},async()=>json({project:await executeCommand(repo,id,input)}))
},{directory:repo.diagnosticsDirectory,operation:'workflow.command',projectId:id})}