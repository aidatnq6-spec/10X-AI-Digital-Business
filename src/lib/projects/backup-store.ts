import { createHash,randomUUID } from 'node:crypto'
import { mkdir,readdir,readFile,open,rename,unlink,lstat,link } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { projectSchema,type Project } from './schema'
import { ProjectError } from './repository'
const reasonSchema=z.enum(['automatic','manual','before-restore'])
export type BackupReason=z.infer<typeof reasonSchema>
const envelope=z.object({formatVersion:z.literal(1),id:z.uuid(),projectId:z.uuid(),createdAt:z.iso.datetime(),reason:reasonSchema,checksum:z.string().regex(/^[a-f0-9]{64}$/),data:projectSchema}).strict()
export type BackupMetadata={id:string;projectId:string;createdAt:string;reason:BackupReason;name:string;revision:number;valid:boolean}
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const isMissing=(e:unknown)=>(e as NodeJS.ErrnoException).code==='ENOENT'
export function validateBackupEnvelope(raw:unknown){
 const candidate=z.object({checksum:z.string(),data:z.unknown()}).passthrough().parse(raw)
 if(candidate.checksum!==hash(candidate.data))throw new z.ZodError([{code:'custom',path:['checksum'],message:'Checksum không hợp lệ.'}])
 const saved=envelope.parse(raw)
 if(saved.data.id!==saved.projectId)throw new z.ZodError([{code:'custom',path:['projectId'],message:'Mã dự án không khớp.'}])
 return saved
}
export function backupEnvelope(saved:z.infer<typeof envelope>){return {...saved,checksum:hash(saved.data)}}
export async function atomicJson(path:string,value:unknown){
 const temporary=path+'.'+randomUUID()+'.tmp'
 try{const f=await open(temporary,'wx');try{await f.writeFile(JSON.stringify(value),'utf8');await f.sync()}finally{await f.close()}await rename(temporary,path)}
 finally{await unlink(temporary).catch(e=>{if(!isMissing(e))throw e})}
}
function fingerprint(project:Project){
 const {revision,updatedAt,commandReceipts,...data}=project
 return hash({...data,jobs:data.jobs.map(({ownerId,ownerPid,ownerHost,leaseUntil,...job})=>job)})
}
export class LocalBackupStore{
 readonly directory:string
 constructor(projectRoot:string){this.directory=join(projectRoot,'.backups')}
 private folder(projectId:string){if(!z.uuid().safeParse(projectId).success)throw new ProjectError('INVALID_ID','Mã dự án sao lưu không hợp lệ.');return join(this.directory,projectId)}
 private path(projectId:string,id:string){if(!z.uuid().safeParse(id).success)throw new ProjectError('INVALID_ID','Mã bản sao lưu không hợp lệ.');return join(this.folder(projectId),id+'.json')}
 async read(projectId:string,id:string){
  const path=this.path(projectId,id)
  try{
   const stat=await lstat(path)
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size>32*1024*1024)throw Error()
   const raw=JSON.parse(await readFile(path,'utf8'))
   // Verify exact stored bytes-as-data before schema defaults can normalize old snapshots.
   if(raw.checksum!==hash(raw.data))throw Error()
   const result=envelope.parse(raw)
   if(result.id!==id||result.projectId!==projectId||result.data.id!==projectId)throw Error()
   return result
  }catch{throw new ProjectError('CORRUPT','Bản sao lưu không đọc được hoặc không qua kiểm tra toàn vẹn. Chọn bản khác; bản gốc được giữ nguyên.')}
 }
 async importFile(input:z.infer<typeof envelope>){
  const saved=backupEnvelope(input),path=this.path(saved.projectId,saved.id)
  await mkdir(this.folder(saved.projectId),{recursive:true})
  const temporary=path+'.'+randomUUID()+'.tmp'
  try{
   const f=await open(temporary,'wx');try{await f.writeFile(JSON.stringify(saved),'utf8');await f.sync()}finally{await f.close()}
   try{await link(temporary,path)}catch(e){
    if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e
    const existing=backupEnvelope(await this.read(saved.projectId,saved.id))
    if(JSON.stringify(existing)!==JSON.stringify(saved))throw new ProjectError('CONFLICT','Mã sao lưu đã chứa dữ liệu khác. Bản đã có được giữ nguyên.')
   }
  }finally{await unlink(temporary).catch(e=>{if(!isMissing(e))throw e})}
 }
 async list(projectId?:string):Promise<BackupMetadata[]>{
  if(projectId)this.folder(projectId)
  let ids:string[]
  try{ids=projectId?[projectId]:(await readdir(this.directory,{withFileTypes:true})).filter(e=>e.isDirectory()&&z.uuid().safeParse(e.name).success).map(e=>e.name)}
  catch(e){if(isMissing(e))return [];throw e}
  const result:BackupMetadata[]=[]
  for(const pid of ids){
   let entries
   try{entries=await readdir(this.folder(pid),{withFileTypes:true})}catch(e){if(isMissing(e))continue;throw e}
   for(const entry of entries.filter(e=>e.isFile()&&e.name.endsWith('.json')&&z.uuid().safeParse(e.name.slice(0,-5)).success)){
    const id=entry.name.slice(0,-5)
    try{const b=await this.read(pid,id);result.push({id,projectId:pid,createdAt:b.createdAt,reason:b.reason,name:b.data.name,revision:b.data.revision,valid:true})}
    catch{result.push({id,projectId:pid,createdAt:'',reason:'automatic',name:'Bản sao lưu không đọc được',revision:0,valid:false})}
   }
  }
  return result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id))
 }
 async health():Promise<{lastSuccessAt:string|null;lastError:string|null}>{
  try{return z.object({lastSuccessAt:z.iso.datetime().nullable(),lastError:z.string().nullable()}).parse(JSON.parse(await readFile(join(this.directory,'health.json'),'utf8')))}
  catch{return {lastSuccessAt:null,lastError:null}}
 }
 private async recordHealth(ok:boolean){
  await mkdir(this.directory,{recursive:true})
  const previous=await this.health()
  await atomicJson(join(this.directory,'health.json'),{lastSuccessAt:ok?new Date().toISOString():previous.lastSuccessAt,lastError:ok?null:'Không tạo được bản sao lưu tự động. Dữ liệu chính vẫn được giữ; kiểm tra dung lượng và quyền ghi rồi thử Sao lưu ngay.'})
 }
 async capture(project:Project,reason:BackupReason='automatic'){
  const parsed=projectSchema.parse(project),folder=this.folder(parsed.id),signature=fingerprint(parsed)
  try{
   await mkdir(folder,{recursive:true})
   if(reason==='automatic'){
    try{
     const latest=z.object({id:z.uuid(),signature:z.string()}).parse(JSON.parse(await readFile(join(folder,'latest.json'),'utf8')))
     if(latest.signature===signature&&fingerprint((await this.read(parsed.id,latest.id)).data)===signature)return latest.id
    }catch{/* Missing or damaged index cannot prevent a fresh verified snapshot. */}
   }
   const id=randomUUID(),backup=envelope.parse({formatVersion:1,id,projectId:parsed.id,createdAt:new Date().toISOString(),reason,checksum:hash(parsed),data:parsed})
   await atomicJson(this.path(parsed.id,id),backup)
   await this.read(parsed.id,id)
   await atomicJson(join(folder,'latest.json'),{id,signature}).catch(()=>{})
   // Index, retention and status are auxiliary: the verified immutable snapshot above is the commit.
   try{const old=(await this.list(parsed.id)).filter(b=>b.valid&&b.id!==id).slice(29);for(const b of old)await unlink(this.path(parsed.id,b.id)).catch(()=>{})}catch{}
   await this.recordHealth(true).catch(()=>{})
   return id
  }catch{
   await this.recordHealth(false).catch(()=>{})
   throw new ProjectError('CORRUPT','Không tạo được bản sao lưu trên máy. Kiểm tra dung lượng hoặc quyền ghi rồi thử lại.')
  }
 }
 async captureSafely(project:Project){try{await this.capture(project)}catch{/* Reported in backup health; never turn an already committed checkpoint into an ambiguous AI retry. */}}
}
