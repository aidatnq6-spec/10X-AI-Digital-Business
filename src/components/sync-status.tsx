'use client'
import { RefreshCw } from 'lucide-react'
import type { SyncState } from '@/hooks/use-project-sync'
import { Button } from './ui/button'
export function SyncStatus({sync}:{sync:SyncState&{refresh:()=>void}}){
 if(sync.state==='idle')return null
 return <section aria-label="Đồng bộ dữ liệu" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line2 bg-surface px-4 py-3 text-sm">
  <div><p role="status" className={sync.state==='offline'?'text-warn':'text-mute'}>{sync.state==='offline'?'Mất kết nối đồng bộ · đang giữ bản đã tải':sync.hidden?'Tạm ngừng cập nhật khi tab bị ẩn':sync.state==='checking'?'Đang kiểm tra dữ liệu trên máy…':'Đã kết nối dữ liệu trên máy'}</p>
   {sync.lastCheckedAt?<p className="mt-1 text-xs text-mute">Kiểm tra thành công gần nhất: {new Date(sync.lastCheckedAt).toLocaleTimeString('vi-VN')}</p>:null}
   {sync.state==='offline'?<p className="mt-1 text-xs text-warn">{sync.error} Bản đang nhập vẫn được giữ. Thử đồng bộ chỉ đọc dữ liệu, không chạy AI.</p>:null}</div>
  <Button variant="outline" className="min-h-11" onClick={sync.refresh}><RefreshCw aria-hidden/>{sync.state==='offline'?'Thử đồng bộ lại':'Kiểm tra đồng bộ'}</Button>
 </section>
}
