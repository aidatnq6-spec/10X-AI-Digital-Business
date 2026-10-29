import { diagnosticContext,reportDiagnostic,diagnosticReference,type DiagnosticContext } from '../diagnostics/server'
import { z } from 'zod'
import { createProjectSchema, patchProjectSchema } from './schema'
import { ProjectError, type ProjectRepository } from './repository'
import { AccessError, assertLocalAccess } from '../server/local-access'
import { reviseBrief } from '../workflow/state-machine'
import { workspaceProject,projectSummary } from './read-models'

const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
export function json(body:unknown,status=200) {return Response.json(body,{status,headers})}
class BodyError extends Error {}
export async function body(request:Request,maxBytes=128*1024) {
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new BodyError('Yêu cầu phải có định dạng JSON.')
  const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0
  if(!reader)throw new BodyError('Thiếu dữ liệu JSON.')
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new BodyError('Dữ liệu vượt quá dung lượng cho phép.')}chunks.push(value)}
  }finally{reader.releaseLock()}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown}catch{throw new BodyError('Dữ liệu gửi lên không hợp lệ.')}
}
export async function handle(action:()=>Promise<Response>,context:DiagnosticContext={}) {
 return diagnosticContext(context,async()=>{
  try{return await action()}
  catch(error) {
    if(error instanceof AccessError) return json({error:error.message},403)
    if(error instanceof BodyError) return json({error:error.message},400)
    if(error instanceof z.ZodError) return json({error:'Vui lòng kiểm tra lại các trường đã nhập.',issues:error.issues.map(x=>({path:x.path.map(String).join('.'),message:x.message}))},400)
    if(error instanceof ProjectError&&error.code!=='CORRUPT') return json({error:error.message,code:error.code},({INVALID_ID:400,NOT_FOUND:404,CONFLICT:409,CORRUPT:500,BUSY:409} as const)[error.code])
    const diagnostic=await reportDiagnostic(error)
    const message=error instanceof ProjectError?error.message:'Không lưu hoặc đọc được dữ liệu trên máy. Nội dung đang nhập vẫn được giữ.'
    const response=json({error:message+' '+diagnosticReference(diagnostic),code:diagnostic.code,diagnostic},500)
    response.headers.set('X-Diagnostic-Id',diagnostic.id);return response
  }
 })
}
export function createProjectHandlers(repository:ProjectRepository) {
  return {
    list:(request:Request)=>handle(async()=>{assertLocalAccess(request);const projects=await repository.list();return json({projects:new URL(request.url).searchParams.get('view')==='summary'?projects.map(projectSummary):projects})},{directory:repository.diagnosticsDirectory,operation:'project.list'}),
    create:(request:Request)=>handle(async()=>{
      assertLocalAccess(request,true)
      const input=createProjectSchema.parse(await body(request))
      return json({project:await repository.create(input)},201)
    },{directory:repository.diagnosticsDirectory,operation:'project.create'}),
    get:(request:Request,id:string)=>handle(async()=>{
      assertLocalAccess(request)
      const query=new URL(request.url).searchParams,view=query.get('view')??'full'
      if(!['full','workspace','history'].includes(view))throw new BodyError('Kiểu đọc dữ liệu không hợp lệ.')
      if(view==='history'){
        const stage=Number(query.get('systemId')),key=query.get('key')
        if(!Number.isInteger(stage)||stage<1||stage>5||!key||key.length>100)throw new BodyError('Phạm vi lịch sử không hợp lệ.')
        const p=await repository.get(id)
        return json({artifacts:p.artifacts.filter(a=>a.systemId===stage&&a.key===key).sort((a,b)=>b.version-a.version),revision:p.revision})
      }
      const before=await repository.versionTag?.(id)
      const tag=before?before.slice(0,-1)+'-'+view+'"':null
      if(tag&&request.headers.get('if-none-match')?.split(',').map(x=>x.trim()).includes(tag))return new Response(null,{status:304,headers:{...headers,ETag:tag}})
      const p=await repository.get(id),after=await repository.versionTag?.(id)
      const response=json({project:view==='workspace'?workspaceProject(p):p})
      if(tag&&before===after)response.headers.set('ETag',tag)
      return response
    },{directory:repository.diagnosticsDirectory,operation:'project.get',projectId:id}),
    patch:(request:Request,id:string)=>handle(async()=>{
      assertLocalAccess(request,true)
      const input=patchProjectSchema.parse(await body(request))
      const project=await repository.update(id,input.expectedRevision,p=>({...reviseBrief(p,input.brief),name:input.name}))
      return json({project})
    },{directory:repository.diagnosticsDirectory,operation:'project.update',projectId:id}),
  }
}