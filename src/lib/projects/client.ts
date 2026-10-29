import { projectSchema, type Brief, type Project } from './schema'
import type { ProjectSummary } from './read-models'
export class ProjectApiError extends Error {
  constructor(message:string,public readonly status:number,public readonly code?:string) {super(message)}
}
async function read(response:Response) {
  const data=await response.json()
  if(!response.ok) throw new ProjectApiError(data.error??'Không kết nối được kho dự án.',response.status,data.code)
  return data
}
export async function listProjects(signal?:AbortSignal):Promise<Project[]> {
  const data=await read(await fetch('/api/projects',{cache:'no-store',signal}))
  return data.projects.map((p:unknown)=>projectSchema.parse(p))
}
export async function getProject(id:string):Promise<Project> {
  const data=await read(await fetch(`/api/projects/${encodeURIComponent(id)}`,{cache:'no-store'}))
  return projectSchema.parse(data.project)
}
export async function listProjectSummaries(signal?:AbortSignal):Promise<ProjectSummary[]> {
 const data=await read(await fetch('/api/projects?view=summary',{cache:'no-store',signal}))
 return data.projects
}
export async function checkProject(id:string,etag?:string,signal?:AbortSignal):Promise<{project:Project|null;etag:string|null}>{
 const response=await fetch(`/api/projects/${encodeURIComponent(id)}?view=workspace`,{cache:'no-store',signal,headers:etag?{'if-none-match':etag}:{}})
 if(response.status===304){if(!etag)throw Error('Phản hồi đồng bộ không có bản dữ liệu tương ứng.');return {project:null,etag:response.headers.get('etag')??etag}}
 const data=await read(response)
 return {project:projectSchema.parse(data.project),etag:response.headers.get('etag')}
}
export async function getWorkspaceProject(id:string,signal?:AbortSignal):Promise<Project>{
 const result=await checkProject(id,undefined,signal)
 if(!result.project)throw Error('Không tải được dự án.')
 return result.project
}
export async function saveProject(current:Project|null,brief:Brief,requestId:string):Promise<Project> {
  const name=`${brief.product} · ${brief.audience}`.slice(0,2000)
  let base=current
  for(let attempt=0;attempt<3;attempt++){
    try{
      const data=await read(await fetch(base?`/api/projects/${encodeURIComponent(base.id)}`:'/api/projects',{
        method:base?'PATCH':'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,brief,...(base?{expectedRevision:base.revision}:{requestId})}),
      }))
      return projectSchema.parse(data.project)
    }catch(e){
      if(!(e instanceof ProjectApiError)||e.code!=='CONFLICT'||!base||attempt===2)throw e
      const latest=await getProject(base.id)
      if(latest.briefVersion!==base.briefVersion)throw e
      base=latest
    }
  }
  throw new Error('Không lưu được đề bài.')
}
export async function sendWorkflowCommand(id:string,command:import('../workflow/commands').WorkflowCommand):Promise<Project>{
 const data=await read(await fetch(`/api/projects/${encodeURIComponent(id)}/commands`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)}))
 return projectSchema.parse(data.project)
}