'use client'
import { useEffect,useState } from 'react'
import { Check,Pause,Play,RefreshCw,PencilLine } from 'lucide-react'
import type { Project } from '@/lib/projects/schema'
import type { WorkflowCommand } from '@/lib/workflow/commands'
import { currentArtifacts,gateItems,pendingGate,stageComplete } from '@/lib/workflow/selectors'
import { Button } from '@/components/ui/button'
import { OpenRouterSettings } from './openrouter-settings'
import { AiBudgetSummary } from './ai-budget-summary'
import { ExportControls,ExportButton } from './export-controls'
import { RunScopeControls } from './run-scope-controls'
import { usageTotals } from '@/lib/ai/limits'
export type CommandAction=WorkflowCommand extends infer T?T extends WorkflowCommand?Omit<T,'requestId'>:never:never
const names=['Sản phẩm Win','Kênh Video AI','Chuyển đổi','Giao hàng & CSKH','Quản trị']
const statusNames={draft:'Sẵn sàng chạy mẫu',queued:'Đang chờ worker',running:'Đang xử lý bước mẫu',waiting_approval:'Đang chờ bạn duyệt',paused:'Đã tạm dừng',failed:'Cần xử lý gián đoạn',completed:'Đã hoàn tất chuỗi mẫu'}
export function ProjectProgress({project,current,onGo,onAction,busy,blocked,onEditing,onFollow,following}:{project:Project;current:number;onGo:(i:number)=>void;onAction:(c:CommandAction)=>Promise<boolean>;busy:boolean;blocked:boolean;onEditing:(v:boolean)=>void;onFollow:()=>void;following:boolean}){
 const [editing,setEditing]=useState<{id:string;content:string;stage:number;key:string;title:string;briefVersion:number}|null>(null)
 const [scope,setScope]=useState<'chain'|'step'>(project.execution.scope)
 const [regenerating,setRegenerating]=useState<string|null>(null)
 useEffect(()=>{setScope(project.execution.scope)},[project.execution.scope])
 const [configDirty,setConfigDirty]=useState(false)
 const [online,setOnline]=useState<boolean|null>(null)
 const [manualCosts,setManualCosts]=useState<Record<string,string>>({})
 useEffect(()=>{onEditing(editing!==null||configDirty);return ()=>onEditing(false)},[editing,onEditing,configDirty])
 useEffect(()=>{
  let disposed=false
  const read=async()=>{try{const r=await fetch('/api/workflow-health',{cache:'no-store'});const data=await r.json();if(!disposed)setOnline(data.online===true)}catch{if(!disposed)setOnline(false)}}
  void read();const interval=setInterval(()=>void read(),4000);return()=>{disposed=true;clearInterval(interval)}
 },[])
 const live=project.workflow.mode==='openrouter',totals=usageTotals(project.jobs)
 const gate=pendingGate(project),items=gate?gateItems(project,gate):currentArtifacts(project,current+1)
 const gaps=gate===2&&items.some(a=>a.criticalGaps.length)
 const disabled=busy||blocked||editing!==null||configDirty||(live&&!project.aiConfig)
 const originalCurrent=editing?currentArtifacts(project).find(a=>a.id===editing.id):null
 const newer=editing?currentArtifacts(project,editing.stage).find(a=>a.key===editing.key):null
 return <section aria-labelledby="workflow-heading" className="mb-6 rounded-2xl border border-glow/30 bg-surface p-4 sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs uppercase tracking-widest text-glow">{live?'Mốc C · AI thật qua OpenRouter':'Mốc B · Chạy quy trình mẫu'}</p><h2 id="workflow-heading" className="mt-2 font-display text-xl font-semibold">{live?(project.status==='draft'?'Sẵn sàng chạy AI thật':project.status==='running'?'Đang tạo nội dung bằng AI':project.status==='completed'?'Đã hoàn tất chuỗi AI':statusNames[project.status]):statusNames[project.status]}</h2><p className="mt-2 text-sm text-mute">{live?('Model: '+(project.aiConfig?.modelId??'chưa chọn')+'. Nội dung AI là bản nháp cần bạn kiểm tra trước khi sử dụng.'):'Nội dung mẫu có sẵn để kiểm tra quy trình. Chưa gọi AI thật · 0 chi phí AI.'}</p></div><span className={`rounded-full border px-3 py-1.5 text-xs ${online?'border-ok/40 text-ok':'border-warn/40 text-warn'}`}>{online===null?'Đang kiểm tra worker…':online?'Worker đang hoạt động':'Worker chưa kết nối'}</span></div>
  <OpenRouterSettings project={project} busy={busy} blocked={blocked||editing!==null} onAction={onAction} onDraftChange={setConfigDirty}/>
  {project.restoredFrom&&live&&!project.aiConfig?<p role="note" className="my-3 rounded-lg border border-warn/40 p-3 text-sm text-warn">Bản khôi phục đang tạm dừng. Chọn model, hạn mức và lưu cấu hình AI thật trước khi chạy tiếp. Khôi phục không tự gửi lượt AI.</p>:null}
  <AiBudgetSummary project={project}/>
  {configDirty?<p role="status" className="my-3 rounded-lg border border-warn/40 p-3 text-sm text-warn">Cấu hình AI đang có thay đổi chưa lưu. Lưu cấu hình hoặc dùng lại bản đã lưu để mở các nút chạy.</p>:null}
  {!live&&totals.calls>0?<div className="my-4 rounded-xl border border-line2 p-3 text-sm text-mute">Lượt gửi AI: {totals.calls} · Phí provider đã báo: {totals.actualUsd.toFixed(6)} USD · Phí bạn đã đối chiếu: {totals.estimatedUsd.toFixed(6)} USD{totals.unresolved?` · ${totals.unresolved} lượt chưa rõ phí, giữ dự phòng ${totals.reservedUsd.toFixed(6)} USD`:''}</div>:null}
  <ol className="my-5 grid gap-2 sm:grid-cols-5" aria-label="Tiến trình năm hệ thống">{names.map((name,i)=><li key={name}><button type="button" onClick={()=>onGo(i)} className={`min-h-16 w-full rounded-xl border p-3 text-left text-sm ${project.workflow.stage===i+1&&project.status!=='draft'?'border-glow text-glow':'border-line2 text-mute'}`}><span className="mb-1 block text-xs">{stageComplete(project,i+1)?'✓ Đã có nội dung':`0${i+1}`}</span>{name}</button></li>)}</ol>
  <RunScopeControls project={project} disabled={disabled} online={online===true} scope={scope} onScope={setScope} onAction={onAction}/>
  <div className="flex flex-wrap gap-3">
   {scope==='chain'&&project.status==='draft'?<Button className="min-h-11" disabled={disabled||online!==true} onClick={()=>void onAction({type:'start',...(live?{acknowledgeCost:true}:{})})}><Play aria-hidden/>{live?'Bắt đầu AI thật (có thể tính phí)':'Bắt đầu chuỗi mẫu'}</Button>:null}
   {['queued','running'].includes(project.status)?<Button variant="outline" className="min-h-11" disabled={busy} onClick={()=>void onAction({type:'pause'})}><Pause aria-hidden/>Tạm dừng sau bước hiện tại</Button>:null}
   {scope==='chain'&&project.execution.scope==='chain'&&['paused','failed'].includes(project.status)&&!project.jobs.some(j=>j.status==='needs_reconciliation')?<Button className="min-h-11" disabled={disabled||online!==true} onClick={()=>void onAction({type:'resume'})}><Play aria-hidden/>Tiếp tục từ checkpoint</Button>:null}
   {project.status!=='draft'&&(!following||current!==project.workflow.stage-1)?<Button variant="outline" className="min-h-11" disabled={disabled} onClick={onFollow}>Quay về bước đang chạy</Button>:null}
  </div>
  {blocked?<p className="mt-3 text-sm text-warn">Lưu đề bài đang sửa trước khi chạy hoặc duyệt nội dung.</p>:null}
  {project.workflow.error?<p role="note" className="mt-4 rounded-xl border border-warn/40 p-3 text-sm text-warn">{project.workflow.error}</p>:null}
  {project.status==='paused'?<p className="mt-3 text-sm text-mute">{project.execution.scope==='step'?'Đã dừng theo phạm vi một bước. Chọn bước khác hoặc chuyển sang cả chuỗi để tiếp tục. Phần hiện hành được giữ lại.':'Tiếp tục sẽ tạo các phần còn thiếu hoặc lỗi thời theo đề bài hiện hành. Phần đã lưu hợp lệ được giữ lại. Lệnh tạm dừng không thu hồi tác vụ đã được gửi.'}</p>:null}
  {project.jobs.filter(j=>j.status==='needs_reconciliation').map(j=><div key={j.id} className="mt-4 rounded-xl border border-warn/40 p-4"><p className="mb-3 text-sm text-warn">Bước {j.systemId} bị gián đoạn. Không tự gửi lại vì chưa rõ kết quả.</p><Button variant="outline" className="min-h-11" disabled={disabled||online!==true} onClick={()=>void onAction({type:'reconcileJob',jobId:j.id,decision:'retry',...(j.mode==='openrouter'?{acknowledgeCost:true}:{})})}><RefreshCw aria-hidden/>{j.mode==='openrouter'?'Đã đối chiếu, cho phép thử lại (có thể tính phí)':'Cho phép chạy lại bước mẫu'}</Button></div>)}
  {totals.unresolved>0?<p className="mt-3 text-sm text-warn">Chưa rõ chi phí của một hoặc nhiều lượt gọi. Lượt AI tiếp theo bị chặn đến khi đối chiếu từ provider hoặc bạn xác nhận số tiền đã kiểm tra trên OpenRouter.</p>:null}
  {project.jobs.filter(j=>j.mode==='openrouter'&&j.sentAt&&(j.usage?.costUsd===null||j.usage?.status==='estimated')).map(j=><div key={`usage-${j.id}`} className="mt-4 rounded-xl border border-warn/40 p-4 text-sm">
   <p className="text-mute">{j.providerRequestId?'Mã provider: '+j.providerRequestId:'Chưa nhận được mã provider. Tra cứu lượt tương ứng trong Activity của OpenRouter.'}</p>
   {j.providerRequestId?<Button variant="outline" className="mt-2 min-h-11" disabled={disabled} onClick={()=>void onAction({type:'reconcileUsage',jobId:j.id})}>Đối chiếu chi phí từ OpenRouter</Button>:null}
   <label htmlFor={`manual-cost-${j.id}`} className="mb-2 mt-4 block">Chi phí bạn đã kiểm tra trên OpenRouter (USD)</label><input id={`manual-cost-${j.id}`} className="min-h-11 w-full max-w-xs rounded-xl border border-line2 bg-background p-2" type="number" min={0} max={10000} step="any" value={manualCosts[j.id]??(j.usage?.status==='estimated'?String(j.usage.costUsd):'')} disabled={disabled} onChange={e=>setManualCosts(values=>({...values,[j.id]:e.target.value}))}/>
   <p className="mt-2 text-xs text-mute">Số bạn nhập được ghi riêng là chi phí do chủ ứng dụng đối chiếu, không gắn nhãn số liệu provider. Việc này không tự gọi lại AI.</p>
   <Button variant="outline" className="mt-3 min-h-11" disabled={disabled||!(manualCosts[j.id]??(j.usage?.status==='estimated'?String(j.usage.costUsd):''))} onClick={()=>void onAction({type:'recordUsage',jobId:j.id,costUsd:Number(manualCosts[j.id]??j.usage?.costUsd),acknowledgeCost:true})}>Xác nhận phí đã đối chiếu</Button>
  </div>)}
  {gate?<div className="mt-5 rounded-xl border border-warn/50 bg-warn/5 p-4"><h3 className="font-semibold">Điểm duyệt {gate}</h3><p className="mt-2 text-sm text-mute">{gate===1?'Kiểm tra định vị, khách hàng, bộ chào bán và bảng giá.':'Kiểm tra chung kịch bản video và nội dung chuyển đổi bên dưới.'} Quyết định duyệt gắn với các phiên bản đang hiển thị.</p>{gaps?<div className="mt-3 text-sm text-warn"><p>Bộ quảng bá còn thiếu thông tin liên hệ. Bổ sung tại đề bài hoặc chủ động chọn CTA không chứa số liên hệ.</p><Button variant="outline" className="mt-3 min-h-11 whitespace-normal" disabled={disabled} onClick={()=>void onAction({type:'useGenericCta'})}>Dùng CTA chung, bỏ chỗ thiếu liên hệ</Button></div>:null}<Button className="mt-4 min-h-11" disabled={disabled||gaps||online!==true} onClick={()=>void onAction({type:'approve',gate,briefVersion:project.briefVersion,artifactVersionIds:items.map(a=>a.id)})}><Check aria-hidden/>Duyệt {gate} và {project.execution.scope==='step'?'dừng':'tiếp tục'}</Button></div>:null}
  {editing?<div data-testid="artifact-editor" className="mt-5 rounded-xl border border-glow/50 p-4">
    <h3 className="mb-2 font-semibold">Bản đang sửa: {editing.title}</h3>
    {!originalCurrent?<div className="mb-3 rounded-lg border border-warn/40 p-3 text-sm text-warn"><p>Phiên bản gốc đã thay đổi. Bản bạn đang nhập vẫn được giữ ở đây để sao chép hoặc đối chiếu.</p>{newer?<details className="mt-3"><summary className="cursor-pointer">Xem bản mới trên máy</summary><pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm">{newer.content}</pre></details>:null}{newer&&newer.briefVersion===editing.briefVersion?<Button variant="outline" className="mt-3 min-h-11 whitespace-normal" disabled={busy} onClick={()=>setEditing({...editing,id:newer.id})}>Dùng bản sửa của tôi trên phiên bản mới</Button>:<p className="mt-2">Đề bài nền đã đổi hoặc không còn bản hiện hành tương ứng. Sao chép phần cần giữ và kiểm tra lại theo đề bài mới trước khi chỉnh sửa.</p>}</div>:null}
    <label htmlFor="artifact-content" className="mb-2 block text-sm">Sửa nội dung</label><textarea id="artifact-content" className="min-h-72 w-full rounded-xl border border-line2 bg-background p-3 text-sm" value={editing.content} disabled={busy} onChange={e=>setEditing({...editing,content:e.target.value})}/>
    <p className="mt-2 text-xs text-mute">Lưu tạo phiên bản mới và làm mất duyệt phần phụ thuộc. Bạn sẽ bấm Tiếp tục để tạo lại các phần cần thiết.</p>
    <div className="mt-3 flex flex-wrap gap-3"><Button className="min-h-11" disabled={busy||!originalCurrent||!editing.content.trim()} onClick={()=>{void onAction({type:'reviseArtifact',artifactId:editing.id,content:editing.content}).then(ok=>{if(ok)setEditing(null)})}}>Lưu phiên bản nội dung</Button><Button variant="outline" className="min-h-11" disabled={busy} onClick={()=>setEditing(null)}>Hủy bản sửa</Button></div>
  </div>:null}
  <ExportControls project={project} disabled={busy||blocked||editing!==null}/>
  <div className="mt-5 space-y-3">{items.map(item=><details key={item.id} className="rounded-xl border border-line2 p-4"><summary className="cursor-pointer text-sm font-semibold">{item.title} <span className="ml-2 font-normal text-mute">· bản {item.version} · {item.status==='approved'?'đã duyệt':item.mode==='openrouter'?'bản nháp AI':'bản nháp mẫu'}</span></summary><p className="mt-3 text-xs text-warn">{item.mode==='openrouter'?('Nội dung AI · '+(item.modelId??'OpenRouter')+'. Thông số kỹ thuật cần được xác nhận.'):'Nội dung mẫu · chưa phải kết quả AI. Mọi thông số kỹ thuật cần được xác nhận.'}</p><pre className="my-4 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-mute">{item.content}</pre><Button variant="outline" className="min-h-11" disabled={disabled} onClick={()=>setEditing({id:item.id,content:item.content,stage:item.systemId,key:item.key,title:item.title,briefVersion:item.briefVersion})}><PencilLine aria-hidden/>Sửa nội dung</Button><div className="mt-3"><ExportButton project={project} format="txt" artifactId={item.id} label="Tải TXT nội dung này" disabled={busy||blocked||editing!==null}/></div>
    {['video-script','social-post'].includes(item.kind)?<div className="mt-3">
     <Button variant="outline" className="min-h-11" disabled={disabled||project.jobs.some(j=>['dispatching','running','needs_reconciliation'].includes(j.status)||(j.status==='queued'&&project.status!=='paused'))} onClick={()=>setRegenerating(item.id)}><RefreshCw aria-hidden/>Tạo lại riêng</Button>
     {regenerating===item.id?<div className="mt-3 rounded-lg border border-warn/40 p-3 text-sm">
      <p>Chỉ tạo phiên bản mới cho “{item.title}”. Bản cũ và phần đã duyệt độc lập được giữ nguyên. {item.systemId===2?'Nội dung chuyển đổi phụ thuộc và các bước sau sẽ cần tạo/duyệt lại khi thành công.':'Điểm duyệt 2 và các bước sau sẽ cần kiểm tra lại khi thành công.'} Xong mục này sẽ dừng, không tự chạy cả chuỗi.</p>
      <div className="mt-3 flex flex-wrap gap-3"><Button className="min-h-11 whitespace-normal" disabled={disabled||online!==true||project.jobs.some(j=>['dispatching','running','needs_reconciliation'].includes(j.status)||(j.status==='queued'&&project.status!=='paused'))} onClick={()=>void onAction({type:'regenerateArtifact',artifactId:item.id,...(live?{acknowledgeCost:true}:{})}).then(ok=>{if(ok)setRegenerating(null)})}>Xác nhận tạo lại{live?' (có thể tính phí)':''}</Button><Button variant="outline" className="min-h-11" disabled={busy} onClick={()=>setRegenerating(null)}>Hủy tạo lại</Button></div>
     </div>:null}
    </div>:null}
    {project.artifacts.filter(a=>a.systemId===item.systemId&&a.key===item.key&&a.id!==item.id).length?<details className="mt-4 rounded-lg border border-line2 p-3"><summary className="cursor-pointer text-sm">Xem lịch sử phiên bản</summary>{project.artifacts.filter(a=>a.systemId===item.systemId&&a.key===item.key&&a.id!==item.id).sort((a,b)=>b.version-a.version).map(a=><div key={a.id} className="mt-4"><p className="text-xs text-mute">Bản {a.version} · đề bài {a.briefVersion} · {a.status==='stale'?'đã thay thế / lỗi thời':a.status==='approved'?'đã duyệt':'bản nháp'} · {a.mode==='openrouter'?'AI':'mẫu'}</p><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-mute">{a.content}</pre></div>)}</details>:null}
</details>)}</div>
  {!items.length&&project.status!=='draft'?<p className="mt-4 text-sm text-mute">Chưa có nội dung hiện hành tại tab này. Worker sẽ lưu kết quả khi xong bước.</p>:null}
  {project.status==='completed'?<p role="status" className="mt-5 rounded-xl border border-ok/40 p-4 text-sm text-ok">Đã hoàn tất 5 hệ thống qua đúng 2 điểm duyệt. {live?'Kết quả AI đã lưu;':'Kết quả mẫu đã lưu;'} chưa có bài đăng, email hoặc dịch vụ nào được gửi ra ngoài.</p>:null}
 </section>
}