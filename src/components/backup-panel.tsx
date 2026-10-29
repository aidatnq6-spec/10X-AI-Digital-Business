'use client'
import { useEffect,useRef,useState } from 'react'
import { ArchiveRestore,DatabaseBackup,RefreshCw } from 'lucide-react'
import type { Project } from '@/lib/projects/schema'
import { projectSchema } from '@/lib/projects/schema'
import type { BackupMetadata } from '@/lib/projects/backup-store'
import { Button } from './ui/button'
import { PortableBackup } from './portable-backup'
type Catalog={backups:BackupMetadata[];health:{lastSuccessAt:string|null;lastError:string|null};unreadableProjects:string[]}
const reason={automatic:'Tự động',manual:'Thủ công','before-restore':'Trước khôi phục'}
const time=(value:string)=>value?new Date(value).toLocaleString('vi-VN'):'Không đọc được thời gian'
export function BackupPanel({project,blocked,busy,onBusy,onRestored}:{project:Project|null;blocked:boolean;busy:boolean;onBusy:(v:boolean)=>void;onRestored:(p:Project)=>void}){
 const [catalog,setCatalog]=useState<Catalog|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('')
 const [working,setWorking]=useState(false),[loading,setLoading]=useState(false)
 const [filter,setFilter]=useState('current'),[selected,setSelected]=useState(''),[confirm,setConfirm]=useState(false),[consent,setConsent]=useState(false)
 const readPending=useRef(false)
 const pending=useRef<{key:string;id:string}|null>(null)
 async function load(signal?:AbortSignal){
  if(readPending.current||document.visibilityState==='hidden')return
  readPending.current=true;setLoading(true)
  try{const r=await fetch('/api/backups',{cache:'no-store',signal});const data=await r.json();if(!r.ok)throw Error(data.error);if(!signal?.aborted){setCatalog(data);setError('')}}
  catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'Không đọc được danh sách sao lưu.')}
  finally{readPending.current=false;if(!signal?.aborted)setLoading(false)}
 }
 useEffect(()=>{const controller=new AbortController();void load(controller.signal);const timer=setInterval(()=>void load(controller.signal),30000);const visibility=()=>{if(document.visibilityState!=='hidden')void load(controller.signal)};document.addEventListener('visibilitychange',visibility);return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visibility)}},[project?.id])
 useEffect(()=>{setSelected('');setConfirm(false);setConsent(false)},[project?.id])
 const entries=(catalog?.backups??[]).filter(b=>filter==='all'||!project||b.projectId===project.id)
 const backup=entries.find(b=>b.id===selected)
 const disabled=busy||working||blocked
 async function mutate(type:'create'|'restore'){
  if(disabled||type==='restore'&&(!backup?.valid||!consent))return
  if(type==='create'&&!project)return
  const key=backup?backup.projectId+':'+backup.id:''
  if(type==='restore'&&pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()}
  setWorking(true);onBusy(true);setError('');setMessage('')
  try{
   const r=await fetch('/api/backups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(type==='create'?{type,projectId:project!.id}:{type,projectId:backup!.projectId,backupId:backup!.id,requestId:pending.current!.id,acknowledgeRestore:true})})
   const data=await r.json();if(!r.ok)throw Error(data.error)
   if(type==='restore'){const restored=projectSchema.parse(data.project);onRestored(restored);pending.current=null;setSelected('');setConfirm(false);setConsent(false);setMessage('Đã mở bản khôi phục riêng. Dự án gốc còn nguyên; AI chưa chạy.')}
   else setMessage('Đã sao lưu dữ liệu đã lưu trên máy.')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Không thực hiện được sao lưu hoặc khôi phục.')}
  finally{setWorking(false);onBusy(false)}
 }
 return <section aria-labelledby="backup-heading" data-testid="backup-panel" className="mb-6 rounded-2xl border border-line2 bg-surface p-4 sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="backup-heading" className="flex items-center gap-2 font-display text-xl font-semibold"><DatabaseBackup className="size-5 text-glow" aria-hidden/>Sao lưu & khôi phục</h2><p className="mt-2 text-sm text-mute">Tự sao lưu khi dữ liệu thay đổi; worker kiểm tra bổ sung khi mở và mỗi 15 phút. Giữ 30 bản hợp lệ gần nhất mỗi dự án trên máy này.</p></div><Button variant="outline" className="min-h-11" disabled={disabled||!project} onClick={()=>void mutate('create')}>Sao lưu ngay</Button></div>
  <p className="mt-3 text-xs text-mute">Chỉ sao lưu dữ liệu đã lưu, không gồm thay đổi đang nhập, API key hoặc file .env.local. Bản sao nằm trong thư mục dữ liệu .local/projects/.backups trên cùng máy.</p>
  {catalog?.health.lastSuccessAt?<p className="mt-3 text-sm text-mute">Sao lưu thành công gần nhất: {time(catalog.health.lastSuccessAt)}</p>:null}
  {catalog?.health.lastError?<p role="alert" className="mt-3 text-sm text-warn">{catalog.health.lastError}</p>:null}
  {catalog?.unreadableProjects.length?<p role="alert" className="mt-3 text-sm text-warn">Có {catalog.unreadableProjects.length} dự án không đọc được. Tệp gốc vẫn được giữ. Chọn tất cả dự án để tìm bản sao lưu có thể khôi phục.</p>:null}
  {blocked?<p className="mt-3 text-sm text-warn">Lưu hoặc hủy thay đổi đang nhập trước khi sao lưu hay khôi phục.</p>:null}
  {error?<p role="alert" className="mt-3 text-sm text-warn">{error}</p>:null}
  {message?<p role="status" className="mt-3 text-sm text-ok">{message}</p>:null}
  <div className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
   <div><label htmlFor="backup-filter" className="mb-2 block text-sm">Phạm vi sao lưu</label><select id="backup-filter" className="min-h-11 w-full rounded-xl border border-line2 bg-background p-2 text-sm" value={filter} disabled={disabled} onChange={e=>{setFilter(e.target.value);setSelected('');setConfirm(false);setConsent(false)}}><option value="current">Dự án hiện tại</option><option value="all">Tất cả dự án</option></select></div>
   <div className="min-w-0"><label htmlFor="backup-selection" className="mb-2 block text-sm">Bản sao lưu muốn khôi phục</label><select id="backup-selection" className="min-h-11 w-full min-w-0 rounded-xl border border-line2 bg-background p-2 text-sm" value={selected} disabled={disabled} onChange={e=>{setSelected(e.target.value);setConfirm(false);setConsent(false)}}><option value="">Chọn bản sao lưu ({entries.length})</option>{entries.map(b=><option key={b.id} value={b.id} disabled={!b.valid}>{b.valid?time(b.createdAt)+' · '+b.name+' · '+reason[b.reason]:'Bản hỏng — không thể khôi phục'}</option>)}</select></div>
   <Button variant="outline" className="min-h-11 self-end" disabled={working||loading} onClick={()=>void load()}><RefreshCw aria-hidden/>{loading?'Đang tải…':'Tải danh sách'}</Button>
  </div>
  {backup?<div className="mt-4 rounded-xl border border-line2 p-4 text-sm"><p className="break-words font-semibold">{backup.name}</p><p className="mt-2 text-mute">{time(backup.createdAt)} · phiên bản lưu {backup.revision} · {reason[backup.reason]}</p><p className="mt-2 text-mute">Khôi phục tạo một dự án riêng ở trạng thái tạm dừng. Dự án hiện tại vẫn còn nguyên. Lịch sử phí đã biết được giữ; model và hạn mức AI cần chọn và lưu lại trước khi chạy AI thật.</p>
   <Button variant="outline" className="mt-3 min-h-11" disabled={disabled||!backup.valid} onClick={()=>setConfirm(true)}><ArchiveRestore aria-hidden/>Khôi phục bản đã chọn</Button>
   {confirm?<div className="mt-4 rounded-lg border border-warn/40 p-3"><label className="flex min-h-11 items-start gap-3"><input className="mt-1 size-4 shrink-0" type="checkbox" checked={consent} disabled={disabled} onChange={e=>setConsent(e.target.checked)}/>Tôi muốn mở bản sao lưu này thành dự án khôi phục riêng, giữ nguyên bản gốc.</label><div className="mt-3 flex flex-wrap gap-3"><Button className="min-h-11 whitespace-normal" disabled={disabled||!consent} onClick={()=>void mutate('restore')}>Xác nhận khôi phục bản riêng</Button><Button variant="outline" className="min-h-11" disabled={working} onClick={()=>{setConfirm(false);setConsent(false)}}>Hủy khôi phục</Button></div></div>:null}
  </div>:!loading&&catalog&&!entries.length?<p className="mt-4 text-sm text-mute">Chưa có bản sao lưu trong phạm vi này. Lưu một đề bài hoặc bấm Sao lưu ngay.</p>:null}
  <PortableBackup key={project?.id??"empty"} project={project} disabled={disabled} onBusy={onBusy} onRestored={onRestored}/>
 </section>
}
