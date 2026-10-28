import { z } from 'zod'
import { createProjectSchema, patchProjectSchema } from './schema'
import { ProjectError, type ProjectRepository } from './repository'
import { AccessError, assertLocalAccess } from '../server/local-access'
import { reviseBrief } from '../workflow/state-machine'

const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
export function json(body:unknown,status=200) {return Response.json(body,{status,headers})}
class BodyError extends Error {}
export async function body(request:Request) {
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new BodyError('Yêu cầu phải có định dạng JSON.')
  const text=await request.text()
  if(Buffer.byteLength(text,'utf8')>128*1024) throw new BodyError('Đề bài quá dài. Vui lòng rút gọn nội dung.')
  try{return JSON.parse(text) as unknown} catch {throw new BodyError('Dữ liệu gửi lên không hợp lệ.')}
}
export async function handle(action:()=>Promise<Response>) {
  try{return await action()}
  catch(error) {
    if(error instanceof AccessError) return json({error:error.message},403)
    if(error instanceof BodyError) return json({error:error.message},400)
    if(error instanceof z.ZodError) return json({error:'Vui lòng kiểm tra lại các trường đã nhập.',issues:error.issues.map(x=>({path:x.path.map(String).join('.'),message:x.message}))},400)
    if(error instanceof ProjectError) return json({error:error.message,code:error.code},({INVALID_ID:400,NOT_FOUND:404,CONFLICT:409,CORRUPT:500,BUSY:409} as const)[error.code])
    return json({error:'Không lưu hoặc đọc được dữ liệu trên máy. Vui lòng thử lại; nội dung đang nhập vẫn được giữ.'},500)
  }
}
export function createProjectHandlers(repository:ProjectRepository) {
  return {
    list:(request:Request)=>handle(async()=>{assertLocalAccess(request);return json({projects:await repository.list()})}),
    create:(request:Request)=>handle(async()=>{
      assertLocalAccess(request,true)
      const input=createProjectSchema.parse(await body(request))
      return json({project:await repository.create(input)},201)
    }),
    get:(request:Request,id:string)=>handle(async()=>{assertLocalAccess(request);return json({project:await repository.get(id)})}),
    patch:(request:Request,id:string)=>handle(async()=>{
      assertLocalAccess(request,true)
      const input=patchProjectSchema.parse(await body(request))
      const project=await repository.update(id,input.expectedRevision,p=>({...reviseBrief(p,input.brief),name:input.name}))
      return json({project})
    }),
  }
}