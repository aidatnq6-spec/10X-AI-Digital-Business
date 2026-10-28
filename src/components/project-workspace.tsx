'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, FolderOpen, PencilLine, RefreshCw } from 'lucide-react'
import { briefSchema, emptyBrief, type BriefDraft, type Project } from '@/lib/projects/schema'
import { icaPreset } from '@/lib/projects/ica-preset'
import { getProject, listProjects, ProjectApiError, saveProject, sendWorkflowCommand } from '@/lib/projects/client'
import { ProjectBriefForm, type FieldIssue } from '@/components/project-brief-form'
import { Button } from '@/components/ui/button'
import { BackupPanel } from '@/components/backup-panel'
import { ProjectProgress,type CommandAction } from '@/components/project-progress'
import type { WorkflowCommand } from '@/lib/workflow/commands'

const activeKey='mission-control.active-project.v1'
const money=(value:number)=>`${new Intl.NumberFormat('vi-VN').format(value)} ₫`
const time=(value:string)=>new Date(value).toLocaleString('vi-VN')
function remember(id:string) {try{localStorage.setItem(activeKey,id)}catch{/* Server data remains durable when browser storage is unavailable. */}}
function BriefSummary({project}:{project:Project}) {
  const b=project.brief
  return <div className="space-y-4">
    <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-mute">Ngách</dt><dd className="mt-1 break-words">{b.niche}</dd></div><div><dt className="text-xs text-mute">Khách hàng</dt><dd className="mt-1 break-words">{b.audience}</dd></div><div><dt className="text-xs text-mute">Sản phẩm / dịch vụ</dt><dd className="mt-1 break-words">{b.product}</dd></div><div><dt className="text-xs text-mute">Nhà cung cấp</dt><dd className="mt-1 break-words">{b.supplier||'Chưa bổ sung'}</dd></div></dl>
    <dl className="grid gap-3 text-sm sm:grid-cols-2">{[["Thương hiệu",b.brand],["Ưu đãi và điều kiện khác",b.notes],["Tài liệu / nguồn tham khảo",b.sources]].map(([label,value])=><div key={label}><dt className="text-xs text-mute">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value||"Chưa bổ sung"}</dd></div>)}</dl>
    <div className="space-y-2">{b.offers.map(o=><div key={o.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-line p-3"><div className="min-w-0 flex-1"><p className="break-words font-medium">{o.name}</p><p className="mt-1 text-xs text-mute">{o.durationMonths?`${o.durationMonths} tháng chính`:'Không có thời hạn'}{o.bonusMonths?` · Tặng thêm ${o.bonusMonths} tháng`:''}</p></div><strong className="tabular-nums text-glow">{money(o.priceVnd)}</strong></div>)}</div>
    <div className="flex flex-wrap gap-2 text-xs">{[b.acquisition==='new'?'Cấp mới':b.acquisition==='renewal'?'Gia hạn':b.acquisition==='other'?'Hình thức khác':'Chưa xác định hình thức',b.vat==='included'?'Đã gồm VAT':b.vat==='excluded'?'Chưa gồm VAT':'VAT chưa xác định',b.usbToken==='included'?'Đã gồm USB Token':b.usbToken==='excluded'?'Chưa gồm USB Token':b.usbToken==='not_applicable'?'Không áp dụng Token':'Token chưa xác định'].map(x=><span key={x} className="rounded-full border border-line2 px-2.5 py-1">{x}</span>)}</div>
    {!b.contact?<p className="text-xs text-warn">Chưa có thông tin liên hệ. Bạn có thể bổ sung trước khi duyệt nội dung quảng bá.</p>:<p className="break-words text-sm text-mute">Liên hệ: {b.contact}</p>}
  </div>
}

export function ProjectWorkspace({current,onGo}:{current:number|null;onGo:(index:number)=>void}) {
  const createRequestId=useRef<string|null>(null)
  const [project,setProject]=useState<Project|null>(null)
  const [projects,setProjects]=useState<Project[]>([])
  const [draft,setDraft]=useState<BriefDraft>(emptyBrief)
  const [dirty,setDirty]=useState(false)
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [issues,setIssues]=useState<FieldIssue[]>([])
  const [conflict,setConflict]=useState<Project|null>(null)
    const [reload,setReload]=useState(0)
  const [contentDirty,setContentDirty]=useState(false)
  const [following,setFollowing]=useState(false)
  const projectRef=useRef(project),dirtyRef=useRef(dirty),contentDirtyRef=useRef(contentDirty),currentRef=useRef(current),followRef=useRef(false),autoTarget=useRef<number|null>(null)
  const receiveRef=useRef<(p:Project)=>void>(()=>{})
  const pendingRequest=useRef<{signature:string;command:WorkflowCommand}|null>(null)
  projectRef.current=project;dirtyRef.current=dirty;contentDirtyRef.current=contentDirty;currentRef.current=current
  const onEditing=useCallback((value:boolean)=>setContentDirty(value),[])
  function follow(snapshot:Project){
    if(dirtyRef.current||contentDirtyRef.current)return
    followRef.current=true;setFollowing(true);autoTarget.current=snapshot.workflow.stage-1;onGo(snapshot.workflow.stage-1)
  }
  receiveRef.current=(incoming:Project)=>{
    const previous=projectRef.current
    if(!previous||incoming.id!==previous.id||incoming.revision<=previous.revision)return
    if(dirtyRef.current&&incoming.briefVersion!==previous.briefVersion){setConflict(incoming);return}
    projectRef.current=incoming;setProject(incoming)
    if(!dirtyRef.current)setDraft(structuredClone(incoming.brief))
    setProjects(items=>items.map(p=>p.id===incoming.id?incoming:p))
    if(followRef.current&&!dirtyRef.current&&!contentDirtyRef.current&&incoming.status!=='draft'&&currentRef.current!==incoming.workflow.stage-1){autoTarget.current=incoming.workflow.stage-1;onGo(incoming.workflow.stage-1)}
  }
  useEffect(()=>{
    if(autoTarget.current===current){autoTarget.current=null;return}
    followRef.current=false;setFollowing(false)
  },[current])
  useEffect(()=>{
    if(!project?.id)return
    let active=true,running=false
    const id=project.id
    const read=async()=>{if(running)return;running=true;try{const next=await getProject(id);if(active)receiveRef.current(next)}catch{/* The last checkpoint remains visible; the next poll retries reading only. */}finally{running=false}}
    const timer=setInterval(()=>void read(),700)
    return()=>{active=false;clearInterval(timer)}
  },[project?.id])
  async function action(input:CommandAction):Promise<boolean>{
    if(busy||!project)return false
    const signature=JSON.stringify(input)
    if(pendingRequest.current?.signature!==signature)pendingRequest.current={signature,command:{...input,requestId:crypto.randomUUID()} as WorkflowCommand}
    setBusy(true);setError('');setMessage('')
    try{
      const saved=await sendWorkflowCommand(project.id,pendingRequest.current.command)
      receiveRef.current(saved);pendingRequest.current=null
      if(['start','resume','approve','reconcileJob','useGenericCta','runStep','runChain','regenerateArtifact'].includes(input.type))follow(saved)
      return true
    }catch(e){setError(e instanceof Error?e.message:'Không thực hiện được lệnh.');return false}
    finally{setBusy(false)}
  }

  useEffect(()=>{
    const controller=new AbortController()
    setLoading(true);setLoadError(false);setError('')
    listProjects(controller.signal).then(items=>{
      if(controller.signal.aborted) return
      setProjects(items)
      let active:string|null=null
      try{active=localStorage.getItem(activeKey)}catch{/* browser storage is optional */}
      const selected=items.find(x=>x.id===active)??items[0]??null
      setProject(selected);setDraft(selected?structuredClone(selected.brief):emptyBrief());setDirty(false)
      if(selected) remember(selected.id)
    }).catch(e=>{if(!controller.signal.aborted) {setLoadError(true);setError(e instanceof Error?e.message:'Không tải được dự án.')}}).finally(()=>{if(!controller.signal.aborted) setLoading(false)})
    return ()=>controller.abort()
  },[reload])
  useEffect(()=>{
    if(!dirty&&!contentDirty) return
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',warn)
    return ()=>window.removeEventListener('beforeunload',warn)
  },[dirty,contentDirty])

  function edit(next:BriefDraft) {dirtyRef.current=true;setDraft(next);setDirty(true);setIssues([]);setMessage('')}
  function selectProject(id:string) {
    const selected=projects.find(p=>p.id===id)
    if(!selected||dirty||contentDirty||busy) return
    setProject(selected);setDraft(structuredClone(selected.brief));setConflict(null);setIssues([]);setError('');setMessage('');remember(selected.id)
  }
  async function save() {
    const parsed=briefSchema.safeParse(draft)
    if(!parsed.success) {setIssues(parsed.error.issues.map(x=>({path:x.path.map(String).join('.'),message:x.message})));return}
    if(busy||loading||loadError) return
    setBusy(true);setError('');setMessage('')
    try {
      createRequestId.current??=crypto.randomUUID()
      const saved=await saveProject(project,parsed.data,createRequestId.current)
      setProject(saved);setDraft(structuredClone(saved.brief));setDirty(false);setConflict(null);remember(saved.id)
      setProjects(items=>[saved,...items.filter(x=>x.id!==saved.id)])
      setMessage('Đã lưu đề bài trên máy. Cả 5 hệ thống dùng chung phiên bản này.')
    } catch(e) {
      setError(e instanceof Error?e.message:'Không lưu được đề bài. Nội dung đang nhập vẫn được giữ.')
      if(e instanceof ProjectApiError&&e.code==='CONFLICT'&&(project||createRequestId.current)) {
        try{setConflict(await getProject(project?.id??createRequestId.current!))}catch{/* Keep the draft even if fetching the comparison fails. */}
      }
    } finally {setBusy(false)}
  }
  if(current===null) return <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line2 bg-surface px-5 py-4"><div><p className="font-semibold">Bắt đầu từ một đề bài</p><p className="mt-1 text-sm text-mute">{loading?'Đang mở kho dự án…':project?`Đã có đề bài: ${project.name}`:'Nhập đề bài rồi chạy thử chuỗi 5 hệ thống với 2 điểm duyệt.'}</p></div><Button className="min-h-11" onClick={()=>onGo(0)}>Mở Sản phẩm Win<ArrowRight aria-hidden/></Button></div>
  return <><section aria-labelledby="shared-brief-heading" className="mb-6 rounded-2xl border border-line2 bg-surface p-4 sm:p-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs uppercase tracking-widest text-glow">Đề bài chung · Đã có luồng Mốc B</p><h2 id="shared-brief-heading" className="mt-2 font-display text-xl font-semibold">{current===0?'Sản phẩm Win':'Đề bài chung của dự án'}</h2></div>{project?<span className="flex items-center gap-1.5 rounded-full border border-ok/40 px-3 py-1.5 text-xs text-ok"><Check className="size-3.5" aria-hidden/>Đã lưu · Phiên bản {project.briefVersion}</span>:null}</div>
    {loading?<p role="status" className="py-8 text-mute">Đang tải đề bài đã lưu…</p>:<>
      {error?<div role="alert" className="mb-4 rounded-xl border border-warn/50 p-4 text-sm text-warn"><p>{error}</p>{!dirty&&!project?<Button variant="outline" className="mt-3 min-h-11" onClick={()=>setReload(x=>x+1)}><RefreshCw aria-hidden/>Thử tải lại</Button>:null}</div>:null}
      {message?<p role="status" className="mb-4 rounded-xl border border-ok/30 bg-ok/5 p-3 text-sm text-ok">{message}</p>:null}
      {conflict?<div data-testid="conflict-comparison" className="mb-5 space-y-4 rounded-xl border border-warn/50 p-4"><h3 className="font-semibold">Bản đang có trên máy · {time(conflict.updatedAt)}</h3><BriefSummary project={conflict}/><p className="text-sm text-warn">Giữ nội dung của bạn rồi lưu sẽ thay thế toàn bộ đề bài bằng bản đang nhập, kể cả các mục bổ sung.</p><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={()=>{setProject(conflict);setDraft(structuredClone(conflict.brief));setDirty(false);setConflict(null);setError('');setIssues([])}}>Dùng bản đã lưu</Button><Button variant="outline" onClick={()=>{setProject(conflict);setConflict(null);setError('');setMessage('Đã đối chiếu phiên bản mới. Kiểm tra nội dung của bạn rồi bấm Lưu đề bài.')}}>Giữ nội dung của tôi để sửa tiếp</Button></div></div>:null}
      {current===0&&project&&project.status!=='draft'?<p className="mb-4 rounded-xl border border-warn/40 p-3 text-sm text-warn">Lưu đề bài đã sửa sẽ tạm dừng chuỗi và đánh dấu kết quả phụ thuộc là lỗi thời. Bấm Tiếp tục khi bạn muốn tạo lại các phần đó.</p>:null}
      {current===0?<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ProjectBriefForm draft={draft} onChange={edit} onSave={save} onPreset={()=>{edit(structuredClone(icaPreset));setMessage('Đã điền mẫu ICA. Kiểm tra thông tin rồi bấm Lưu đề bài.')}} busy={busy||loadError||contentDirty} issues={issues} dirty={dirty}/>
        <aside className="space-y-4 rounded-2xl border border-line bg-background/60 p-4"><div className="flex items-center gap-2 font-semibold"><FolderOpen aria-hidden className="size-4 text-glow"/>Bản đã lưu</div>{projects.length>1?<div><label htmlFor="active-project" className="mb-2 block text-xs text-mute">Chọn đề bài đã lưu</label><select id="active-project" className="min-h-11 w-full rounded-lg border border-line2 bg-background p-2 text-sm" value={project?.id??''} disabled={dirty||contentDirty||busy} onChange={e=>selectProject(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>:null}{project?<><p className="text-xs text-mute">Lưu lúc {time(project.updatedAt)}</p><BriefSummary project={project}/></>:<p className="text-sm text-mute">Chưa có đề bài đã lưu. Điền 4 mục chính hoặc chọn mẫu ICA để bắt đầu.</p>}<p className="border-t border-line pt-3 text-xs leading-relaxed text-mute">Đề bài được lưu trên máy này. Chạy quy trình mẫu và duyệt ở phần bên dưới. Bạn có thể chọn model và hạn mức OpenRouter trong phần quy trình.</p></aside>
      </div>:<><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-mute">{dirty?'Có thay đổi chưa lưu tại Sản phẩm Win. Bên dưới là phiên bản đã lưu gần nhất.':'Thông tin được dùng chung, bạn không cần nhập lại ở tab này.'}</p><Button variant="outline" className="min-h-11" onClick={()=>onGo(0)}><PencilLine aria-hidden/>Chỉnh sửa tại Sản phẩm Win</Button></div>{project?<BriefSummary project={project}/>:<p className="text-mute">Chưa có đề bài. Hãy lưu thông tin tại Sản phẩm Win trước.</p>}<p className="mt-5 rounded-xl border border-dashed border-line2 p-4 text-sm text-mute">Phần quy trình bên dưới hiển thị kết quả đã lưu, với nhãn phân biệt AI thật và dữ liệu mẫu.</p></>}
    </>}
  </section>
  <BackupPanel project={project} blocked={dirty||contentDirty} busy={busy||loading} onBusy={setBusy} onRestored={restored=>{
    projectRef.current=restored;setProject(restored);setDraft(structuredClone(restored.brief));setDirty(false);setContentDirty(false);setConflict(null);setIssues([]);setError('');setLoadError(false);remember(restored.id);setProjects(items=>[restored,...items.filter(p=>p.id!==restored.id)]);pendingRequest.current=null;createRequestId.current=null;followRef.current=false;setFollowing(false);autoTarget.current=null;onGo(0);setMessage('Đã mở bản khôi phục riêng. Bản gốc vẫn được giữ; AI chưa chạy.')
  }}/>
  {project&&!loading?<ProjectProgress key={project.id} project={project} current={current} onGo={onGo} onAction={action} busy={busy} blocked={dirty} onEditing={onEditing} following={following} onFollow={()=>follow(project)}/>:null}
  </>
}