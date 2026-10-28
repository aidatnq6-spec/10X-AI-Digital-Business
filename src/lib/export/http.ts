import { z } from 'zod'
import type { ProjectRepository } from '../projects/repository'
import { ProjectError } from '../projects/repository'
import { handle } from '../projects/http'
import { assertLocalAccess } from '../server/local-access'
import { exportText } from './text'
import { managementCsv,managementGuide } from './csv'
const querySchema=z.object({format:z.enum(['txt','csv','guide']),briefVersion:z.coerce.number().int().positive(),artifactId:z.uuid().optional()}).strict().refine(q=>!q.artifactId||q.format==='txt','Chỉ TXT hỗ trợ tải riêng một nội dung.')
export function exportHandler(repo:ProjectRepository){
 return (request:Request,id:string)=>handle(async()=>{
  assertLocalAccess(request)
  const query=querySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
  const p=await repo.get(id)
  if(p.briefVersion!==query.briefVersion)throw new ProjectError('CONFLICT','Đề bài đã thay đổi. Tải lại trang rồi tải bản mới.')
  const csv=query.format==='csv'
  const text=csv?managementCsv(p.brief):'\uFEFF'+(query.format==='guide'?managementGuide(p):exportText(p,query.artifactId))
  const suffix=csv?'mau-quan-tri.csv':query.format==='guide'?'huong-dan-quan-tri.txt':query.artifactId?'noi-dung-'+query.artifactId.slice(0,8)+'.txt':'toan-bo-noi-dung.txt'
  return new Response(text,{headers:{'Content-Type':csv?'text/csv; charset=utf-8':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="mission-'+p.id.slice(0,8)+'-de-bai-'+p.briefVersion+'-'+suffix+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})
 })
}
