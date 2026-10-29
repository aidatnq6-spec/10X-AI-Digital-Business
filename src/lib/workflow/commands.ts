import { diagnosticContext,diagnosticStep } from '../diagnostics/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { briefSchema,type Project,type ArtifactVersion } from '../projects/schema'
import { ProjectError,type ProjectRepository } from '../projects/repository'
import { currentArtifacts,gateItems,pendingGate,advance,invalidate,reviseBrief,assertCanResume } from './state-machine'
import { stepPrerequisite } from './selectors'
import { queueStage,continueExecution } from './state-machine'
import { transact } from './transaction'
import { contactPlaceholder,genericCta,gapsForContent } from '../ai/grounding'
import { liveInputSchema,type LiveConfig,type ModelQuote } from '../ai/config-schema'
import { fetchModels } from '../ai/catalog'
import { validateConfig } from '../ai/limits'
import { openRouterKey } from '../ai/server-env'
import { OpenRouterProvider } from '../ai/openrouter'
const request={requestId:z.uuid()}
export const commandSchema=z.discriminatedUnion('type',[
 z.object({...request,type:z.literal('runStep'),systemId:z.number().int().min(1).max(5),acknowledgeCost:z.boolean().optional()}).strict(),
 z.object({...request,type:z.literal('runChain'),acknowledgeCost:z.boolean().optional()}).strict(),
 z.object({...request,type:z.literal('regenerateArtifact'),artifactId:z.uuid(),acknowledgeCost:z.boolean().optional()}).strict(),
 z.object({...request,type:z.literal('start'),acknowledgeCost:z.boolean().optional()}).strict(),z.object({...request,type:z.literal('pause')}).strict(),z.object({...request,type:z.literal('resume')}).strict(),
 z.object({...request,type:z.literal('approve'),gate:z.union([z.literal(1),z.literal(2)]),briefVersion:z.number().int().positive(),artifactVersionIds:z.array(z.uuid()).min(1).max(20)}).strict(),
 z.object({...request,type:z.literal('reviseBrief'),expectedBriefVersion:z.number().int().positive(),brief:briefSchema}).strict(),
 z.object({...request,type:z.literal('reviseArtifact'),artifactId:z.uuid(),content:z.string().trim().min(1).max(40000)}).strict(),
 z.object({...request,type:z.literal('useGenericCta')}).strict(),
 z.object({...request,type:z.literal('reconcileJob'),jobId:z.uuid(),decision:z.literal('retry'),acknowledgeCost:z.boolean().optional()}).strict(),
 z.object({...request,type:z.literal('configureAI'),settings:liveInputSchema}).strict(),z.object({...request,type:z.literal('setSampleMode')}).strict(),z.object({...request,type:z.literal('recordUsage'),jobId:z.uuid(),costUsd:z.number().finite().nonnegative().max(10000),acknowledgeCost:z.literal(true)}).strict(),z.object({...request,type:z.literal('reconcileUsage'),jobId:z.uuid()}).strict(),
])
export type WorkflowCommand=z.infer<typeof commandSchema>
function fail(message:string):never{throw new ProjectError('CONFLICT',message)}
function editArtifact(p:Project,item:ArtifactVersion,content:string):Project{
 const from=item.systemId===1?2:item.systemId===2?3:item.systemId===3?4:5
 const gate=item.systemId===1?1:item.systemId<=3?2:null
 let next=invalidate(p,from,gate)
 next={...next,execution:{...p.execution,artifactId:null}}
 next.artifacts=next.artifacts.map(a=>a.id===item.id?{...a,status:'stale'}:a)
 next.artifacts.push({...item,id:randomUUID(),version:item.version+1,content,criticalGaps:gapsForContent(content),status:'draft',createdAt:new Date().toISOString()})
 return next
}
export function applyCommand(p:Project,c:WorkflowCommand,config?:LiveConfig):Project{
 let next=p
 if(c.type==='configureAI'||c.type==='setSampleMode'){
  if(p.jobs.some(j=>['dispatching','running','needs_reconciliation'].includes(j.status)))fail('Cần kết thúc hoặc đối chiếu công việc đang chạy trước khi đổi cấu hình.')
  const mode=c.type==='configureAI'?'openrouter':'sample'
  if(c.type==='configureAI'&&!config)fail('Thiếu cấu hình đã được máy chủ xác minh.')
  const switched=p.workflow.mode!==mode
  next=switched&&p.status!=='draft'?invalidate(p,1,1):p
  const hadQueued=next.jobs.some(j=>j.status==='queued')
  next={...next,aiConfig:c.type==='configureAI'?config!:p.aiConfig,status:hadQueued?'paused':next.status,workflow:{...next.workflow,mode},jobs:next.jobs.map(j=>j.status==='queued'?{...j,status:'cancelled'}:j)}

 }else if(c.type==='runStep'||c.type==='runChain'||c.type==='regenerateArtifact'){
  assertCanResume(p)
  if(p.jobs.some(j=>j.status==='queued')&&p.status!=='paused'&&c.type!=='runChain')fail('Đang chờ chạy một công việc. Tạm dừng và xử lý công việc hiện tại trước.')
  if(p.workflow.mode==='openrouter'&&(!p.aiConfig||c.acknowledgeCost!==true))fail('Cần xác nhận chi phí khi chạy phạm vi đã chọn.')
  if(p.status==='paused')p={...p,jobs:p.jobs.map(j=>j.status==='queued'?{...j,status:'cancelled'}:j)}
  if(c.type==='runChain'){
   next=advance({...p,status:'queued',execution:{scope:'chain',systemId:1,artifactId:null},workflow:{...p.workflow,error:null}})
  }else{
   const item=c.type==='regenerateArtifact'?currentArtifacts(p).find(a=>a.id===c.artifactId):null
   if(c.type==='regenerateArtifact'&&(!item||!['video-script','social-post'].includes(item.kind)))fail('Chỉ tạo lại riêng bài viết hoặc kịch bản hiện hành.')
   const stage=c.type==='runStep'?c.systemId:item!.systemId
   const reason=stepPrerequisite(p,stage);if(reason)fail(reason)
   next=queueStage({...p,execution:{scope:'step',systemId:stage,artifactId:item?.id??null}},stage,item?.id??null)
  }
 }else if(c.type==='start'){
  if(p.status!=='draft')fail('Dự án đã bắt đầu. Dùng nút Tiếp tục thay vì tạo chuỗi mới.')
  if(p.workflow.mode==='openrouter'&&(!p.aiConfig||c.acknowledgeCost!==true))fail('Cần chọn model, hạn mức và xác nhận chi phí trước khi bắt đầu AI thật.')
  next=advance({...p,status:'queued'})
 }else if(c.type==='pause'){
  if(!['queued','running'].includes(p.status))fail('Không có bước đang chạy để tạm dừng.')
  next={...p,status:'paused',workflow:{...p.workflow,error:null}}
 }else if(c.type==='resume'){
  if(!['paused','failed'].includes(p.status))fail('Dự án không ở trạng thái cần tiếp tục.')
  assertCanResume(p);next=continueExecution({...p,workflow:{...p.workflow,error:null}})
 }else if(c.type==='approve'){
  if(pendingGate(p)!==c.gate||p.briefVersion!==c.briefVersion)fail('Điểm duyệt hoặc phiên bản đã thay đổi. Tải bản mới để đối chiếu.')
  const items=gateItems(p,c.gate),ids=items.map(a=>a.id).sort()
  if(JSON.stringify(ids)!==JSON.stringify([...c.artifactVersionIds].sort()))fail('Phiên bản nội dung đã thay đổi. Hãy duyệt lại bản đang hiển thị.')
  if(c.gate===2&&items.some(a=>gapsForContent(a.content).length||a.criticalGaps.length))fail('Cần bổ sung liên hệ hoặc loại bỏ chỗ thiếu trước khi duyệt bộ quảng bá.')
  next={...p,artifacts:p.artifacts.map(a=>ids.includes(a.id)?{...a,status:'approved'}:a),approvals:[...p.approvals,{id:randomUUID(),gate:c.gate,briefVersion:p.briefVersion,artifactVersionIds:ids,approvedAt:new Date().toISOString(),status:'valid'}],status:'queued'}
  next=advance(next)
 }else if(c.type==='reviseBrief'){
  if(p.briefVersion!==c.expectedBriefVersion)fail('Phiên bản đề bài đã thay đổi.')
  next=reviseBrief(p,c.brief)
 }else if(c.type==='reviseArtifact'){
  const item=currentArtifacts(p).find(a=>a.id===c.artifactId)
  if(!item)fail('Phiên bản nội dung không còn hiện hành.')
  next=editArtifact(p,item,c.content)
 }else if(c.type==='useGenericCta'){
  if(pendingGate(p)!==2)fail('CTA chỉ được sửa tại điểm duyệt 2.')
  for(const item of gateItems(p,2).filter(a=>a.content.includes(contactPlaceholder)))next=editArtifact(next,item,item.content.replaceAll(contactPlaceholder,genericCta))
  next=advance({...next,status:'queued'})
  }else if(c.type==='recordUsage'){
  const job=p.jobs.find(j=>j.id===c.jobId&&j.mode==='openrouter'&&j.sentAt)
  if(!job||job.usage?.status==='actual'&&job.usage.costUsd!==null)fail('Không có chi phí chưa rõ cần đối chiếu cho công việc này.')
  next={...p,jobs:p.jobs.map(j=>j.id===job.id?{...j,usage:{status:'estimated',inputTokens:j.usage?.inputTokens??null,outputTokens:j.usage?.outputTokens??null,costUsd:c.costUsd}}:j)}
 }else if(c.type==='reconcileJob'){
  const job=p.jobs.find(j=>j.id===c.jobId&&j.status==='needs_reconciliation')
  if(!job)fail('Công việc này không cần đối chiếu hoặc đã được xử lý.')
  if(job.mode==='openrouter'&&job.sentAt&&(!job.usage||job.usage.costUsd===null))fail('Cần đối chiếu chi phí trước khi thử lại công việc này.')
  if(job.mode==='openrouter'&&c.acknowledgeCost!==true)fail('Cần xác nhận đã đối chiếu và đồng ý chi phí có thể phát sinh khi chạy lại.')
  next={...p,status:'paused',jobs:p.jobs.map(j=>j.id===job.id?{...j,status:'failed',error:'Người dùng đã cho phép chạy lại sau đối chiếu.'}:j)}
  assertCanResume(next);next=continueExecution({...next,workflow:{...p.workflow,error:null}})
 }
 return next
}
export async function executeCommand(repo:ProjectRepository,id:string,input:unknown,services:{models?:()=>Promise<ModelQuote[]>;key?:()=>string;usage?:(id:string)=>Promise<import('../projects/schema').Usage>}={}){
 const command=commandSchema.parse(input),payload=JSON.stringify(command)
 const first=await repo.get(id),receipt=first.commandReceipts.find(x=>x.requestId===command.requestId)
 const systemId='systemId' in command?command.systemId:'artifactId' in command?first.artifacts.find(a=>a.id===command.artifactId)?.systemId??first.workflow.stage:first.workflow.stage
 return diagnosticContext({directory:repo.diagnosticsDirectory,operation:'workflow.command',projectId:id,command:command.type,systemId,...('jobId' in command?{jobId:command.jobId}:{})},async()=>{
 if(receipt){if(receipt.payload!==payload)fail('Mã lệnh đã dùng với nội dung khác.');return first}
 let config:LiveConfig|undefined
 if(command.type==='configureAI'){
  const models=await diagnosticStep('provider.catalog',()=> (services.models??fetchModels)()),quote=models.find(m=>m.id===command.settings.modelId)
  if(!quote)fail('Model chưa hỗ trợ JSON có cấu trúc hoặc chưa có giá xác định. Tải lại danh sách.')
  const {acknowledgeCost,...settings}=command.settings
  config={...settings,quote,consentAt:new Date().toISOString()}
  try{validateConfig(config)}catch(e){fail((e as Error).message)}
 }
 if(['start','resume','approve','reconcileJob','runStep','runChain','regenerateArtifact'].includes(command.type)&&first.workflow.mode==='openrouter'&&!(services.key??openRouterKey)())fail('Chưa có OPENROUTER_API_KEY trong .env.local của dự án Mission Control.')
 if(command.type==='reconcileUsage'){
  const job=first.jobs.find(j=>j.id===command.jobId)
  if(!job?.providerRequestId||job.mode!=='openrouter')fail('Không có mã provider để đối chiếu tự động. Kiểm tra trang Activity trên OpenRouter.')
  const usage=await diagnosticStep('provider.usage',()=> (services.usage??(id=>new OpenRouterProvider().generationUsage(id)))(job.providerRequestId!))
  return transact(repo,id,p=>({...p,jobs:p.jobs.map(j=>j.id===job.id?{...j,usage}:j),commandReceipts:[...p.commandReceipts,{requestId:command.requestId,payload}]}))
 }
 return transact(repo,id,p=>{
  const previous=p.commandReceipts.find(x=>x.requestId===command.requestId)
  if(previous){if(previous.payload!==payload)fail('Mã lệnh đã dùng với nội dung khác.');return p}
  const next=applyCommand(p,command,config)
  return {...next,commandReceipts:[...p.commandReceipts,{requestId:command.requestId,payload}]}
 })
 })
}
