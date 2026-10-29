import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { mkdir,writeFile,rename,unlink,readdir,readFile,lstat } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import type { DiagnosticEvent,DiagnosticOperation,DiagnosticStep } from './types'
export type DiagnosticContext={directory?:string;source?:'web'|'worker';operation?:DiagnosticOperation;step?:DiagnosticStep;projectId?:string;jobId?:string;systemId?:number;command?:string}
const context=new AsyncLocalStorage<DiagnosticContext>(),failures=new WeakMap<object,DiagnosticContext>()
const commands=['start','pause','resume','approve','reviseArtifact','reviseBrief','configureAI','setScope','runStep','runChain','regenerateArtifact','useGenericCta','reconcileJob','reconcileUsage','confirmUsageCost']
const systemCodes=['EACCES','EPERM','ENOENT','EIO','ENOSPC','EBUSY','EEXIST','EMFILE','ENFILE','EPIPE','ECONNRESET','ETIMEDOUT','ECONNREFUSED','EADDRINUSE','ENOTDIR','ENOTEMPTY','EINVAL','EBADF','EISDIR','ENOMEM','EROFS','ESRCH']
const projectCodes=['INVALID_ID','NOT_FOUND','CONFLICT','CORRUPT','BUSY']
const eventSchema=z.object({version:z.literal(1),id:z.uuid(),at:z.iso.datetime(),code:z.string().regex(/^(INTERNAL_ERROR|PROVIDER_ERROR|INVALID_ID|NOT_FOUND|CONFLICT|CORRUPT|BUSY|FS_[A-Z]+)$/),source:z.enum(['web','worker']),operation:z.enum(['project.list','project.get','project.create','project.update','workflow.command','worker.poll','worker.job','worker.heartbeat','backup','diagnostics.read','http.request']),step:z.enum(['unknown','repository.read','repository.lock','repository.write','repository.commit','repository.release','backup.capture','provider.prepare','provider.generate','worker.complete','worker.recover','worker.claim']),pid:z.number().int().positive(),projectId:z.uuid().optional(),jobId:z.uuid().optional(),systemId:z.number().int().min(1).max(5).optional(),command:z.string().refine(x=>commands.includes(x)).optional(),systemCode:z.string().refine(x=>systemCodes.includes(x)).optional(),syscall:z.enum(['open','read','write','rename','unlink','mkdir','rmdir','stat','lstat','scandir','link','fsync']).optional(),errorType:z.enum(['Error','TypeError','SyntaxError','ProjectError','ProviderError','ZodError'])}).strict()
const incidentName=/^\d{17}-[a-f0-9-]{36}\.json$/
const queues=new Map<string,Promise<unknown>>()
export function defaultDiagnosticsDirectory(){return join(process.env.MISSION_CONTROL_DATA_DIR??join(process.cwd(),'.local','projects'),'.diagnostics')}
export function diagnosticContext<T>(value:DiagnosticContext,fn:()=>T):T{return context.run({...context.getStore(),...value},fn)}
export async function diagnosticStep<T>(step:DiagnosticStep,fn:()=>Promise<T>):Promise<T>{
 return diagnosticContext({step},async()=>{try{return await fn()}catch(error){if(error&&typeof error==='object'&&!failures.has(error))failures.set(error,{...context.getStore()});throw error}})
}
export class DiagnosticStore{
 constructor(readonly directory=defaultDiagnosticsDirectory()){}
 async write(event:DiagnosticEvent){
  const parsed=eventSchema.parse(event)
  const previous=queues.get(this.directory)??Promise.resolve()
  const next=previous.catch(()=>{}).then(async()=>{
   await mkdir(this.directory,{recursive:true})
   const name=parsed.at.replace(/\D/g,'')+'-'+parsed.id+'.json',temporary=join(this.directory,'.'+parsed.id+'.tmp')
   try{await writeFile(temporary,JSON.stringify(parsed),{encoding:'utf8',flag:'wx'});await rename(temporary,join(this.directory,name))}
   finally{await unlink(temporary).catch(e=>{if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e})}
   const names=(await readdir(this.directory)).filter(x=>incidentName.test(x)).sort().reverse()
   await Promise.all(names.slice(200).map(x=>unlink(join(this.directory,x)).catch(e=>{if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e})))
  })
  queues.set(this.directory,next)
  try{await next}finally{if(queues.get(this.directory)===next)queues.delete(this.directory)}
 }
 async list(limit=20):Promise<DiagnosticEvent[]>{
  let names:string[]
  try{names=(await readdir(this.directory)).filter(x=>incidentName.test(x)).sort().reverse()}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e}
  const result:DiagnosticEvent[]=[]
  for(const name of names.slice(0,200)){
   try{const path=join(this.directory,name),s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.size>8192)continue;result.push(eventSchema.parse(JSON.parse(await readFile(path,'utf8'))))}catch{/* A corrupt or concurrently pruned incident cannot hide other records. */}
   if(result.length>=Math.max(1,Math.min(200,limit)))break
  }
  return result
 }
}
export async function reportDiagnostic(error:unknown,override:DiagnosticContext={}){
 const tagged=error&&typeof error==='object'?failures.get(error):undefined,c={...context.getStore(),...tagged,...override}
 let raw=error as {code?:unknown;syscall?:unknown;name?:unknown;cause?:unknown}|null
 for(let n=0;n<3;n++){const cause=raw?.cause as typeof raw;if(!cause||typeof cause!=='object')break;if(typeof cause.code==='string'&&systemCodes.includes(cause.code)){raw=cause;break}raw={...raw,cause:cause.cause}}
 const systemCode=typeof raw?.code==='string'&&systemCodes.includes(raw.code)?raw.code:undefined
 const code=systemCode?'FS_'+systemCode:typeof raw?.code==='string'&&projectCodes.includes(raw.code)?raw.code:raw?.name==='ProviderError'?'PROVIDER_ERROR':'INTERNAL_ERROR'
 const uuid=(v:unknown)=>z.uuid().safeParse(v).success?v as string:undefined
 const event:DiagnosticEvent={version:1,id:randomUUID(),at:new Date().toISOString(),code,source:c.source??'web',operation:c.operation??'http.request',step:c.step??'unknown',pid:process.pid,projectId:uuid(c.projectId),jobId:uuid(c.jobId),systemId:Number.isInteger(c.systemId)&&c.systemId!>=1&&c.systemId!<=5?c.systemId:undefined,command:c.command&&commands.includes(c.command)?c.command:undefined,systemCode,syscall:typeof raw?.syscall==='string'&&['open','read','write','rename','unlink','mkdir','rmdir','stat','lstat','scandir','link','fsync'].includes(raw.syscall)?raw.syscall:undefined,errorType:typeof raw?.name==='string'&&['Error','TypeError','SyntaxError','ProjectError','ProviderError','ZodError'].includes(raw.name)?raw.name:'Error'}
 try{await new DiagnosticStore(c.directory).write(event);return {...event,recorded:true}}
 catch{return {...event,recorded:false}}
}
export function diagnosticReference(d:{id:string;at:string;code:string;step:string;recorded:boolean}){return `Mã lỗi ${d.code} · ${d.at} · Bước ${d.step} · Mã đối chiếu ${d.id}${d.recorded?'':' · Chưa ghi được nhật ký trên ổ đĩa'}`}
