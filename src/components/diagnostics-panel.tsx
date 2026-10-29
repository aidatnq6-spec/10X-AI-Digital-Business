'use client'
import { useEffect,useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { DiagnosticEvent } from '@/lib/diagnostics/types'
import { Button } from './ui/button'
const steps:Record<string,string>={'unknown':'Chưa xác định','repository.read':'Đọc dữ liệu','repository.lock':'Giữ khóa dữ liệu','repository.write':'Ghi snapshot tạm','repository.commit':'Chốt snapshot','repository.release':'Nhả khóa dữ liệu','backup.capture':'Tạo sao lưu','provider.prepare':'Chuẩn bị gọi AI','provider.generate':'Tạo nội dung','provider.catalog':'Tải model và giá','provider.usage':'Đối chiếu phí AI','worker.complete':'Lưu kết quả tác vụ','worker.recover':'Kiểm tra tác vụ gián đoạn','worker.claim':'Nhận tác vụ'}
export function DiagnosticsPanel(){
 const [open,setOpen]=useState(false),[events,setEvents]=useState<DiagnosticEvent[]|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[reload,setReload]=useState(0)
 useEffect(()=>{
  if(!open)return
  const controller=new AbortController();setLoading(true);setError('')
  void fetch('/api/diagnostics',{cache:'no-store',signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error??'Không đọc được nhật ký lỗi.');if(!controller.signal.aborted)setEvents(data.events)}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Không đọc được nhật ký lỗi.')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[open,reload])
 return <section aria-labelledby="diagnostics-heading" className="mb-6 rounded-2xl border border-line2 bg-surface p-4 sm:p-6" data-testid="diagnostics-panel"><details onToggle={e=>setOpen(e.currentTarget.open)}><summary className="cursor-pointer"><h2 id="diagnostics-heading" className="inline font-display text-xl font-semibold">Nhật ký lỗi & chẩn đoán</h2></summary>
  <p className="mt-3 text-sm text-mute">20 sự cố gần nhất của web và worker trên máy này. Đối chiếu mã trong thông báo lỗi với bản ghi dưới đây. Nhật ký chỉ có thông tin kỹ thuật, giữ tối đa 200 bản và không tự gửi ra ngoài.</p>
  <Button variant="outline" className="my-3 min-h-11" disabled={loading} onClick={()=>setReload(x=>x+1)}><RefreshCw aria-hidden/>{loading?'Đang đọc nhật ký…':'Tải lại nhật ký lỗi'}</Button>
  {error?<p role="alert" className="text-sm text-warn">{error}</p>:null}
  {events?.length===0?<p className="text-sm text-mute">Chưa ghi nhận sự cố. Nhật ký mới bắt đầu từ bản cập nhật này.</p>:null}
  <div className="space-y-3">{events?.map(event=><article key={event.id} className="rounded-xl border border-line2 p-3 text-sm"><p className="font-semibold text-warn">{event.code} · {new Date(event.at).toLocaleString('vi-VN')}</p><p className="mt-2 text-mute">{event.source==='worker'?'Worker':'Web'} · {event.operation}{event.command?` · ${event.command}`:''}{event.systemId?` · Hệ thống ${event.systemId}`:''}</p><p className="mt-2">Bước: {steps[event.step]??event.step} <span className="text-mute">({event.step})</span></p><p className="mt-2 break-all text-xs text-mute">Mã đối chiếu: {event.id}</p>{event.systemCode?<p className="mt-2 text-xs text-mute">Lỗi hệ thống: {event.systemCode}{event.syscall?` · ${event.syscall}`:''}</p>:null}</article>)}</div>
 </details></section>
}
