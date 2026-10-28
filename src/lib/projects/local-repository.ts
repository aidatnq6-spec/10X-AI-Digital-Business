import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, open, rename, unlink, rmdir } from 'node:fs/promises'
import { hostname } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { createProjectSchema, projectSchema, type Brief, type Project } from './schema'
import { ProjectError, type ProjectRepository } from './repository'
import { LocalBackupStore } from './backup-store'
import { recoverDeadOwner } from './lock-recovery'

const delay = (ms:number) => new Promise(resolve => setTimeout(resolve,ms))
function isCode(error:unknown,code:string) { return (error as NodeJS.ErrnoException)?.code===code }

export class LocalProjectRepository implements ProjectRepository {
  readonly backups:LocalBackupStore
  constructor(private readonly root=process.env.MISSION_CONTROL_DATA_DIR??join(process.cwd(),'.local','projects')) {this.backups=new LocalBackupStore(root)}
  private directory(id:string) {
    if(!z.uuid().safeParse(id).success) throw new ProjectError('INVALID_ID','Mã dự án không hợp lệ.')
    return join(this.root,id)
  }
  async get(id:string):Promise<Project> {
    const directory=this.directory(id)
    let data:string
    try { data=await readFile(join(directory,'state.json'),'utf8') }
    catch(error) { if(isCode(error,'ENOENT')) throw new ProjectError('NOT_FOUND','Không tìm thấy dự án.'); throw error }
    try { return projectSchema.parse(JSON.parse(data)) }
    catch { throw new ProjectError('CORRUPT','Không đọc được dữ liệu dự án. Hãy giữ bản gốc để phục hồi; không tạo đè lên dữ liệu này.') }
  }
  async list() {
    await mkdir(this.root,{recursive:true})
    const entries=await readdir(this.root,{withFileTypes:true})
    const ids=entries.filter(e=>e.isDirectory()&&z.uuid().safeParse(e.name).success).map(e=>e.name)
    const projects=await Promise.all(ids.map(async id=>{try{return await this.get(id)}catch(e){if(e instanceof ProjectError&&e.code==='CORRUPT')return null;throw e}}))
    return projects.filter((p):p is Project=>p!==null).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id))
  }
  private async lock(directory:string) {
    const path=join(directory,'write.lock')
    const token=randomUUID()
    for(let attempt=0;attempt<80;attempt++) {
      try {
        const file=await open(path,'wx')
        try { await file.writeFile(JSON.stringify({token,pid:process.pid,hostname:hostname(),createdAt:new Date().toISOString()})); await file.sync() }
        finally { await file.close() }
        return async()=>{
          const owner=JSON.parse(await readFile(path,'utf8')) as {token:string}
          if(owner.token===token) await unlink(path)
        }
      } catch(error) {
        if(!isCode(error,'EEXIST')) throw error
        if(await recoverDeadOwner(directory)) continue
        await delay(25)
      }
    }
    // Never reclaim by age; only a verified dead local owner can be recovered.
    throw new ProjectError('BUSY','Dữ liệu đang bị khóa. Thử lưu lại; nếu vẫn lỗi sau khi mở lại ứng dụng, cần phục hồi khóa trước khi lưu.')
  }
  private async write(directory:string,project:Project) {
    const path=join(directory,`${randomUUID()}.tmp`)
    try {
      const file=await open(path,'wx')
      try { await file.writeFile(JSON.stringify(project,null,2),'utf8'); await file.sync() }
      finally { await file.close() }
      await rename(path,join(directory,'state.json'))
    } finally { await unlink(path).catch(error=>{if(!isCode(error,'ENOENT')) throw error}) }
  }
  async create(input:{name:string;brief:Brief;requestId?:string}) {
    const value=createProjectSchema.parse(input)
    const id=value.requestId??randomUUID(), now=new Date().toISOString()
    const directory=this.directory(id)
    const reconcile=(project:Project)=>{
      if(project.name!==value.name||JSON.stringify(project.brief)!==JSON.stringify(value.brief)) throw new ProjectError('CONFLICT','Đề bài đã được lưu nhưng nội dung hiện tại đã thay đổi. Đối chiếu bản đã lưu trước khi tiếp tục.')
      return project
    }
    try{return reconcile(await this.get(id))}
    catch(error){if(!(error instanceof ProjectError&&error.code==='NOT_FOUND'))throw error}
    await mkdir(this.root,{recursive:true})
    // Hidden staging is not listed. Publish the complete directory in one rename.
    const staging=join(this.root,`.creating-${id}-${randomUUID()}`)
    await mkdir(staging)
    try {
      const project=projectSchema.parse({schemaVersion:1,id,name:value.name,revision:1,briefVersion:1,workflowEpoch:1,status:'draft',brief:value.brief,briefVersions:[{version:1,brief:value.brief,savedAt:now}],artifacts:[],approvals:[],jobs:[],createdAt:now,updatedAt:now})
      await this.write(staging,project)
      try{await rename(staging,directory)}
      catch(error){
        // Another request with this ID may have published first; never replace it.
        let existing:Project
        try{existing=await this.get(id)}catch{throw error}
        return reconcile(existing)
      }
      await this.backups.captureSafely(project)
      return project
    } finally {
      await unlink(join(staging,'state.json')).catch(error=>{if(!isCode(error,'ENOENT'))throw error})
      await rmdir(staging).catch(error=>{if(!isCode(error,'ENOENT'))throw error})
    }
  }
  async update(id:string,expectedRevision:number,mutation:(current:Project)=>Project) {
    const directory=this.directory(id)
    // Read before locking so missing projects return NOT_FOUND instead of filesystem errors.
    await this.get(id)
    const release=await this.lock(directory)
    try {
      const current=await this.get(id)
      if(current.revision!==expectedRevision) throw new ProjectError('CONFLICT','Dự án đã được sửa ở cửa sổ khác. Tải bản đã lưu để đối chiếu; bản đang nhập vẫn được giữ.')
      const next=mutation(structuredClone(current))
      const changed=JSON.stringify(next.brief)!==JSON.stringify(current.brief)
      const now=new Date().toISOString()
      const project=projectSchema.parse({...next,id:current.id,createdAt:current.createdAt,revision:current.revision+1,updatedAt:now,briefVersion:current.briefVersion+(changed?1:0),workflowEpoch:changed?current.workflowEpoch+1:next.workflowEpoch,briefVersions:changed?[...current.briefVersions,{version:current.briefVersion+1,brief:next.brief,savedAt:now}]:current.briefVersions})
      await this.backups.capture(current)
      await this.write(directory,project)
      await this.backups.captureSafely(project)
      return project
    } finally { await release() }
  }

  async unreadableProjects(){
    await mkdir(this.root,{recursive:true})
    const errors:string[]=[]
    for(const e of await readdir(this.root,{withFileTypes:true})){
      if(!e.isDirectory()||!z.uuid().safeParse(e.name).success)continue
      try{await this.get(e.name)}catch(error){if(error instanceof ProjectError&&error.code==='CORRUPT')errors.push(e.name);else throw error}
    }
    return errors
  }
  async backupAll(){for(const project of await this.list())await this.backups.captureSafely(project)}
  async restoreBackup(projectId:string,backupId:string,requestId:string):Promise<Project>{
    const directory=this.directory(requestId)
    const reconcile=(project:Project)=>{
      if(project.restoredFrom?.projectId!==projectId||project.restoredFrom?.backupId!==backupId)throw new ProjectError('CONFLICT','Mã khôi phục đã dùng cho dữ liệu khác.')
      return project
    }
    try{return reconcile(await this.get(requestId))}catch(e){if(!(e instanceof ProjectError&&e.code==='NOT_FOUND'))throw e}
    const saved=(await this.backups.read(projectId,backupId)).data
    let current:Project|null=null
    try{current=await this.get(projectId)}catch(e){if(!(e instanceof ProjectError&&['NOT_FOUND','CORRUPT'].includes(e.code)))throw e}
    if(current?.jobs.some(j=>['dispatching','running','needs_reconciliation'].includes(j.status)))throw new ProjectError('CONFLICT','Dự án gốc đang chạy hoặc có lượt cần đối chiếu. Kết thúc hoặc đối chiếu lượt đó trước khi khôi phục.')
    if(current)await this.backups.capture(current,'before-restore')
    const jobs=[...new Map([...saved.jobs,...(current?.jobs??[])].map(j=>[j.id,j])).values()].map(j=>({...j,status:j.status==='queued'?'cancelled' as const:['dispatching','running','needs_reconciliation'].includes(j.status)?'failed' as const:j.status,ownerId:null,ownerPid:null,ownerHost:null,leaseUntil:null}))
    const now=new Date().toISOString()
    const restored=projectSchema.parse({...saved,id:requestId,name:(saved.name+' · Khôi phục').slice(0,2000),revision:1,createdAt:now,updatedAt:now,status:'paused',workflowEpoch:Math.max(saved.workflowEpoch,current?.workflowEpoch??0)+1,jobs,aiConfig:null,commandReceipts:[],execution:{scope:'step',systemId:saved.workflow.stage,artifactId:null},workflow:{...saved.workflow,gate:null,error:null},restoredFrom:{projectId,backupId,restoredAt:now}})
    await mkdir(this.root,{recursive:true})
    const staging=join(this.root,`.creating-${requestId}-${randomUUID()}`)
    await mkdir(staging)
    try{
      await this.write(staging,restored)
      try{await rename(staging,directory)}catch(e){try{return reconcile(await this.get(requestId))}catch{throw e}}
      await this.backups.captureSafely(restored)
      return restored
    }finally{
      await unlink(join(staging,'state.json')).catch(e=>{if(!isCode(e,'ENOENT'))throw e})
      await rmdir(staging).catch(e=>{if(!isCode(e,'ENOENT'))throw e})
    }
  }
}
