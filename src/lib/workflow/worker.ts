import { diagnosticContext,diagnosticStep,reportDiagnostic,diagnosticReference,identifyDiagnosticJob } from '../diagnostics/server'
import { hostname } from 'node:os'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { usageSchema,type Job,type Project } from '../projects/schema'
import type { ProjectRepository } from '../projects/repository'
import { transact } from './transaction'
import { advance,currentArtifacts,invalidate } from './state-machine'
import { validateOutput,outputItemSchema,jobOutputKeys } from '../ai/artifact-schemas'
import { ProviderError,unknownUsage,zeroUsage,type WorkflowProvider } from '../ai/provider'
import { checkBudget,reservationUsd } from '../ai/limits'
export type WorkerOwner={id:string;pid:number;hostname:string}
class Skip extends Error{}
export async function claimNext(repo:ProjectRepository,owner:WorkerOwner,now=Date.now()):Promise<{projectId:string;job:Job}|null>{
 for(const project of await repo.list()){
  if(!['queued','running'].includes(project.status)||!project.jobs.some(j=>j.status==='queued'))continue
  let claimed:Job|null=null
  const candidate=project.jobs.find(j=>j.status==='queued'&&j.workflowEpoch===project.workflowEpoch&&j.briefVersion===project.briefVersion)
  try{
   await diagnosticContext({source:'worker',directory:repo.diagnosticsDirectory,operation:'worker.job',projectId:project.id,jobId:candidate?.id,systemId:candidate?.systemId},()=>transact(repo,project.id,p=>{
    if(!['queued','running'].includes(p.status)||p.jobs.some(j=>['dispatching','running','needs_reconciliation'].includes(j.status)))throw new Skip()
    const job=p.jobs.find(j=>j.status==='queued'&&j.workflowEpoch===p.workflowEpoch&&j.briefVersion===p.briefVersion)
    if(!job)throw new Skip()
    identifyDiagnosticJob(job)
    if(job.mode==='openrouter'){
     try{if(!job.configSnapshot)throw new Error('Chưa có cấu hình AI.');checkBudget(job.configSnapshot,p.jobs)}
     catch(e){return {...p,status:'paused',workflow:{...p.workflow,error:(e as Error).message}}}
    }
    claimed={...job,reservedCostUsd:job.mode==='openrouter'?reservationUsd(job.configSnapshot!):0,status:'dispatching',ownerId:owner.id,ownerPid:owner.pid,ownerHost:owner.hostname,leaseUntil:now+30000,startedAt:new Date(now).toISOString()}
    return {...p,status:'running',jobs:p.jobs.map(j=>j.id===job.id?claimed!:j)}
   }))
   if(claimed)return {projectId:project.id,job:claimed}
  }catch(e){if(!(e instanceof Skip))throw e}
 }
 return null
}
export async function completeJob(repo:ProjectRepository,projectId:string,jobId:string,ownerId:string,raw:unknown){
 return transact(repo,projectId,p=>{
  const job=p.jobs.find(j=>j.id===jobId)
  if(!job||job.ownerId!==ownerId||!['dispatching','running'].includes(job.status))return p
  const result=Array.isArray(raw)?{items:raw,providerRequestId:null,usage:job.mode==='sample'?zeroUsage:unknownUsage}:z.object({items:z.array(outputItemSchema),providerRequestId:z.string().nullable(),usage:usageSchema}).parse(raw)
  const output=validateOutput(job.systemId,result.items,jobOutputKeys(job))
  const currentIds=new Set(currentArtifacts(p).map(a=>a.id))
  const valid=job.workflowEpoch===p.workflowEpoch&&job.briefVersion===p.briefVersion&&job.inputArtifacts.every(a=>currentIds.has(a.id))
  let base=p
  if(valid&&job.replaceArtifactId){
   base=invalidate(p,job.systemId===2?3:4,2)
   base={...base,status:p.status,execution:{...p.execution,artifactId:null},artifacts:base.artifacts.map(a=>a.id===job.replaceArtifactId?{...a,status:'stale'}:a)}
  }
  const artifacts=output.map(item=>({...item,id:randomUUID(),systemId:job.systemId,version:Math.max(0,...p.artifacts.filter(a=>a.systemId===job.systemId&&a.key===item.key).map(a=>a.version))+1,briefVersion:job.briefVersion,status:valid?'draft' as const:'stale' as const,createdAt:new Date().toISOString(),mode:job.mode,modelId:job.configSnapshot?.modelId??null}))
  let next:Project={...base,artifacts:[...base.artifacts,...artifacts],jobs:base.jobs.map(j=>j.id===jobId?{...j,status:'completed',providerRequestId:result.providerRequestId,finishedAt:new Date().toISOString(),leaseUntil:null,usage:result.usage}:j)}
  if(job.mode==='openrouter'&&result.usage.costUsd===null)next={...next,status:'paused',workflow:{...next.workflow,error:'Đã lưu nội dung nhưng chưa rõ chi phí. Đối chiếu usage trước khi tiếp tục; khoản dự phòng vẫn được giữ.'}}
  if(job.mode==='openrouter'&&job.configSnapshot&&((result.usage.inputTokens??0)>job.configSnapshot.maxInputTokens||(result.usage.outputTokens??0)>job.configSnapshot.maxOutputTokens||result.usage.costUsd!==null&&result.usage.costUsd>job.reservedCostUsd+1e-9))next={...next,status:'paused',workflow:{...next.workflow,error:'Usage thực tế vượt dự toán. Đã dừng bước tiếp theo để bạn kiểm tra hạn mức.'}}
  return valid?advance(next):next
 })
}
export async function recoverExpired(repo:ProjectRepository,now=Date.now()){
 for(const project of await repo.list()){
  const abandoned=(job:Job)=>{
   if(!['dispatching','running'].includes(job.status))return false
   if(job.leaseUntil===null||job.leaseUntil<=now)return true
   if(job.ownerHost===hostname()&&job.ownerPid){try{process.kill(job.ownerPid,0)}catch(e){return (e as NodeJS.ErrnoException).code==='ESRCH'}}
   return false
  }
  if(!project.jobs.some(abandoned))continue
  const candidate=project.jobs.find(abandoned)!
  await diagnosticContext({source:'worker',directory:repo.diagnosticsDirectory,operation:'worker.poll',step:'worker.recover',projectId:project.id,jobId:candidate.id,systemId:candidate.systemId},()=>transact(repo,project.id,p=>{
   const active=p.jobs.find(abandoned);if(!active)return p
   identifyDiagnosticJob(active)
   return {...p,status:'failed',workflow:{...p.workflow,error:'Một công việc bị gián đoạn, cần đối chiếu trước khi chạy lại.'},jobs:p.jobs.map(j=>abandoned(j)?{...j,status:'needs_reconciliation' as const,usage:j.mode==='openrouter'&&!j.sentAt?zeroUsage:j.usage??unknownUsage,error:'Không rõ kết quả sau khi worker bị gián đoạn.'}:j)}
  }))
 }
}
export async function runOnce(repo:ProjectRepository,provider:WorkflowProvider,owner:WorkerOwner){
 const claim=await diagnosticContext({source:'worker',directory:repo.diagnosticsDirectory,operation:'worker.job'},()=>diagnosticStep('worker.claim',()=>claimNext(repo,owner)));if(!claim)return false
 const {projectId,job}=claim
 return diagnosticContext({source:'worker',directory:repo.diagnosticsDirectory,operation:'worker.job',projectId,jobId:job.id,systemId:job.systemId},async()=>{
 const heartbeat=setInterval(()=>{void transact(repo,projectId,p=>({...p,jobs:p.jobs.map(j=>j.id===job.id&&j.ownerId===owner.id&&['dispatching','running'].includes(j.status)?{...j,leaseUntil:Date.now()+30000}:j)})).catch(e=>{void reportDiagnostic(e,{operation:'worker.heartbeat'})})},5000)
 try{
  await diagnosticStep('provider.prepare',async()=>{await provider.prepare?.(job)})
  const running=await transact(repo,projectId,p=>({...p,jobs:p.jobs.map(j=>j.id===job.id&&j.ownerId===owner.id&&j.status==='dispatching'?{...j,status:'running',sentAt:job.mode==='openrouter'?new Date().toISOString():null,usage:job.mode==='openrouter'?unknownUsage:zeroUsage}:j)}))
  if(!running.jobs.some(j=>j.id===job.id&&j.ownerId===owner.id&&j.status==='running'))return true
  const output=await diagnosticStep('provider.generate',()=>provider.generate(job))
  await diagnosticStep('worker.complete',()=>completeJob(repo,projectId,job.id,owner.id,output))
 }catch(e){
  const diagnostic=await reportDiagnostic(e)
  const error=e instanceof ProviderError?e:new ProviderError(job.mode==='sample'?'Bước mẫu không hoàn thành.':'Không rõ kết quả AI; cần đối chiếu trước khi thử lại.',job.mode==='openrouter')
  await transact(repo,projectId,p=>{
   if(!p.jobs.some(j=>j.id===job.id&&j.ownerId===owner.id&&['dispatching','running'].includes(j.status)))return p
   return {...p,status:'failed',workflow:{...p.workflow,error:error.message+' '+diagnosticReference(diagnostic)},jobs:p.jobs.map(j=>j.id===job.id?{...j,status:error.uncertain?'needs_reconciliation':'failed',providerRequestId:error.providerRequestId,usage:job.mode==='sample'?zeroUsage:error.usage,error:error.message,finishedAt:new Date().toISOString(),leaseUntil:null}:j)}
  })
 }finally{clearInterval(heartbeat)}
 return true
 })
}