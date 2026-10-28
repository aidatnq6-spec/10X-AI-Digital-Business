'use client'
import { useEffect,useState } from 'react'
import type { Project } from '@/lib/projects/schema'
import type { CommandAction } from './project-progress'
import { stepPrerequisite,stageComplete } from '@/lib/workflow/selectors'
import { Button } from './ui/button'
const names=['Sản phẩm Win','Kênh Video AI','Chuyển đổi','Giao hàng & CSKH','Quản trị']
export function RunScopeControls({project,disabled,online,scope,onScope,onAction}:{project:Project;disabled:boolean;online:boolean;scope:'chain'|'step';onScope:(scope:'chain'|'step')=>void;onAction:(c:CommandAction)=>Promise<boolean>}){
 const [stage,setStage]=useState(project.execution.systemId)
 useEffect(()=>{setStage(project.execution.systemId)},[project.execution.systemId])
 const active=project.jobs.some(j=>['dispatching','running','needs_reconciliation'].includes(j.status)||(j.status==='queued'&&project.status!=='paused'))
 const live=project.workflow.mode==='openrouter',reason=stepPrerequisite(project,stage),complete=stageComplete(project,stage)
 const cost=live?{acknowledgeCost:true}:{}
 return <div data-testid="run-scope" className="my-4 rounded-xl border border-line2 p-4">
  <fieldset><legend className="mb-3 font-semibold">Phạm vi chạy</legend><div className="flex flex-wrap gap-4">
   <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="radio" name="run-scope" value="chain" checked={scope==='chain'} onChange={()=>onScope('chain')}/>Cả chuỗi</label>
   <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="radio" name="run-scope" value="step" checked={scope==='step'} onChange={()=>onScope('step')}/>Một bước</label>
  </div></fieldset>
  <p className="mt-2 text-sm text-mute">{scope==='chain'?'Chạy các phần còn thiếu, dừng tại hai điểm duyệt. Nội dung hiện hành được giữ lại.':'Chỉ tạo phần còn thiếu của bước được chọn rồi dừng. Vẫn cần đáp ứng điều kiện và hai điểm duyệt hiện tại.'}</p>
  {scope==='step'?<div className="mt-4 space-y-3">
   <label htmlFor="run-stage" className="block text-sm">Bước muốn chạy</label>
   <select id="run-stage" className="min-h-11 w-full rounded-xl border border-line2 bg-background p-2 text-sm" value={stage} disabled={active||disabled} onChange={e=>setStage(Number(e.target.value))}>{names.map((name,i)=><option key={name} value={i+1}>{i+1}. {name}</option>)}</select>
   {reason?<p className="text-sm text-warn">{reason}</p>:complete?<p className="text-sm text-mute">Bước đã có đủ nội dung. Mở bài viết hoặc kịch bản bên dưới và chọn “Tạo lại riêng” nếu cần bản mới.</p>:null}
   <Button className="min-h-11 whitespace-normal" disabled={disabled||!online||active||Boolean(reason)||complete} onClick={()=>void onAction({type:'runStep',systemId:stage,...cost})}>Chạy bước đã chọn{live?' (có thể tính phí)':''}</Button>
   {project.execution.artifactId&&['failed','paused'].includes(project.status)?<Button variant="outline" className="min-h-11 whitespace-normal" disabled={disabled||!online||active} onClick={()=>void onAction({type:'resume'})}>Thử lại mục đã chọn{live?' (có thể tính phí)':''}</Button>:null}
  </div>:project.execution.scope==='step'&&!active?<Button className="mt-4 min-h-11 whitespace-normal" disabled={disabled||!online||project.status==='completed'} onClick={()=>void onAction({type:'runChain',...cost})}>Chuyển sang chạy cả chuỗi{live?' (có thể tính phí)':''}</Button>:null}
  <p className="mt-3 text-xs text-mute">Đang áp dụng: {project.execution.scope==='chain'?'cả chuỗi':'một bước — '+names[project.execution.systemId-1]}. Đổi lựa chọn không tự gửi yêu cầu AI.</p>
 </div>
}
