import { randomUUID } from 'node:crypto'
import { jobSchema,type Project,type Brief } from '../projects/schema'
import { ProjectError } from '../projects/repository'
import { expectedKeys } from '../ai/artifact-schemas'
export {currentArtifacts,pendingGate,gateItems,approved,stageComplete} from './selectors'
import {currentArtifacts,approved,stageComplete,stepPrerequisite} from './selectors'
export function invalidate(p:Project,from:number,gate:1|2|null):Project{
 return {...p,status:'paused',execution:{scope:'chain',systemId:1,artifactId:null},workflowEpoch:p.workflowEpoch+1,
  workflow:{...p.workflow,stage:from,gate:null,error:'Nội dung đã thay đổi. Kiểm tra phạm vi cần tạo lại trước khi tiếp tục.'},
  artifacts:p.artifacts.map(a=>a.systemId>=from?{...a,status:'stale' as const}:a),
  approvals:p.approvals.map(a=>(gate!==null&&a.gate>=gate)?{...a,status:'invalid' as const}:a),
  jobs:p.jobs.map(j=>j.status==='queued'?{...j,status:'cancelled' as const}:j)}
}
export function reviseBrief(p:Project,brief:Brief):Project{
 if(JSON.stringify(p.brief)===JSON.stringify(brief))return p
 return {...(p.status==='draft'?p:invalidate(p,1,1)),brief}
}
export function advance(p:Project):Project{
 if(p.status==='paused'||p.status==='failed')return p
 if(p.jobs.some(j=>['queued','dispatching','running','needs_reconciliation'].includes(j.status)))return p
 let stage=1,gate:1|2|null=null
 if(!stageComplete(p,1))stage=1
 else if(!approved(p,1)){stage=1;gate=1}
 else if(!stageComplete(p,2))stage=2
 else if(!stageComplete(p,3))stage=3
 else if(!approved(p,2)){stage=3;gate=2}
 else if(!stageComplete(p,4))stage=4
 else if(!stageComplete(p,5))stage=5
 else return {...p,status:'completed',workflow:{mode:p.workflow.mode,stage:5,gate:null,error:null}}
 if(gate)return {...p,status:'waiting_approval',workflow:{mode:p.workflow.mode,stage,gate,error:null}}
 if(p.execution.scope==='step')return {...p,status:'paused',workflow:{mode:p.workflow.mode,stage:p.execution.systemId,gate:null,error:null}}
 return queueStage(p,stage)
}
export function assertCanResume(p:Project){
 if(p.jobs.some(j=>j.mode==='openrouter'&&j.sentAt&&(!j.usage||j.usage.costUsd===null)))throw new ProjectError('CONFLICT','Cần đối chiếu chi phí chưa rõ trước khi tiếp tục AI.')
 if(p.jobs.some(j=>j.status==='needs_reconciliation'))throw new ProjectError('CONFLICT','Cần đối chiếu công việc chưa rõ kết quả trước khi tiếp tục.')
 if(p.jobs.some(j=>['dispatching','running'].includes(j.status)))throw new ProjectError('CONFLICT','Bước hiện tại đang kết thúc. Chờ lưu checkpoint rồi tiếp tục.')
}
export function queueStage(p:Project,stage:number,artifactId:string|null=null):Project{
 const target=artifactId?currentArtifacts(p,stage).find(a=>a.id===artifactId):null
 if(artifactId&&!target)throw new ProjectError('CONFLICT','Phiên bản được chọn đã thay đổi. Chọn lại nội dung hiện hành.')
 const outputKeys=target?[target.key]:expectedKeys(stage).filter(k=>!currentArtifacts(p,stage).some(a=>a.key===k))
 if(!outputKeys.length)throw new ProjectError('CONFLICT','Bước này đã có đủ nội dung. Dùng Tạo lại riêng trên bài viết hoặc kịch bản.')
 const inputArtifacts=currentArtifacts(p).filter(a=>a.systemId<stage||a.id===artifactId).map(({id,systemId,key,title,content})=>({id,systemId,key,title,content}))
 const job=jobSchema.parse({mode:p.workflow.mode,configSnapshot:p.workflow.mode==='openrouter'?p.aiConfig:null,outputKeys,replaceArtifactId:artifactId,reservedCostUsd:0,sentAt:null,id:randomUUID(),systemId:stage,briefVersion:p.briefVersion,workflowEpoch:p.workflowEpoch,idempotencyKey:`${p.id}:${stage}:${p.workflowEpoch}:${p.jobs.length+1}`,status:'queued',providerRequestId:null,usage:null,inputBrief:structuredClone(p.brief),inputArtifacts})
 return {...p,status:'queued',workflow:{mode:p.workflow.mode,stage,gate:null,error:null},jobs:[...p.jobs,job]}
}
export function continueExecution(p:Project):Project{
 if(p.execution.scope==='chain'||p.jobs.some(j=>j.status==='queued'))return advance({...p,status:'queued'})
 const {systemId,artifactId}=p.execution
 const reason=stepPrerequisite(p,systemId)
 if(reason)throw new ProjectError('CONFLICT',reason)
 if(artifactId||!stageComplete(p,systemId))return queueStage(p,systemId,artifactId)
 return advance({...p,status:'queued'})
}
