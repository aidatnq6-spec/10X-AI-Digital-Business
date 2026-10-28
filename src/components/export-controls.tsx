'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import type { Project } from '@/lib/projects/schema'
import { currentArtifacts } from '@/lib/workflow/selectors'
import { Button } from './ui/button'
export function ExportButton({project,format,artifactId,label,disabled=false}:{project:Project;format:'txt'|'csv'|'guide';artifactId?:string;label:string;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 async function download(){
  if(busy||disabled)return
  setBusy(true);setError('')
  try{
   const query=new URLSearchParams({format,briefVersion:String(project.briefVersion),...(artifactId?{artifactId}:{})})
   const response=await fetch('/api/projects/'+encodeURIComponent(project.id)+'/export?'+query,{cache:'no-store'})
   if(!response.ok){const data=await response.json();throw Error(data.error??'Không tải được tệp.')}
   const blob=await response.blob(),url=URL.createObjectURL(blob)
   try{
    const a=document.createElement('a');a.href=url;a.download=response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]??'mission-content.txt'
    document.body.appendChild(a);a.click();a.remove()
   }finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}
  }catch(e){setError(e instanceof Error?e.message:'Không tải được tệp. Thử lại sau.')}
  finally{setBusy(false)}
 }
 return <div><Button type="button" variant="outline" className="min-h-11 whitespace-normal" disabled={disabled||busy} onClick={()=>void download()}><Download className="size-4" aria-hidden/>{busy?'Đang chuẩn bị tệp…':label}</Button>{error?<p role="alert" className="mt-2 max-w-xl text-sm text-warn">{error}</p>:null}</div>
}
export function ExportControls({project,disabled}:{project:Project;disabled:boolean}){
 const items=currentArtifacts(project)
 return <section aria-labelledby="export-heading" data-testid="export-panel" className="my-5 rounded-xl border border-line2 bg-background/40 p-4">
  <h3 id="export-heading" className="font-semibold">Tải thành phẩm · TXT / CSV</h3>
  <p className="mt-2 text-sm text-mute">Có {items.length} nội dung hiện hành đã lưu. TXT ghi rõ nguồn AI/mẫu, phiên bản và trạng thái duyệt. Mở từng nội dung bên dưới để tải riêng.</p>
  <div className="mt-4 flex flex-wrap gap-3">
   <ExportButton project={project} format="txt" label="Tải toàn bộ TXT" disabled={disabled||!items.length}/>
   <ExportButton project={project} format="csv" label="Tải mẫu quản trị CSV trống" disabled={disabled}/>
   <ExportButton project={project} format="guide" label="Tải hướng dẫn CSV (TXT)" disabled={disabled}/>
  </div>
  <p className="mt-3 text-xs leading-relaxed text-mute">CSV chỉ có tiêu đề cột, chưa chứa khách hàng hay doanh thu. Bảng giá và cách tính thành tiền nằm trong TXT hướng dẫn riêng. Tải tệp không gọi AI hoặc gửi nội dung ra mạng xã hội.</p>
  {disabled?<p className="mt-2 text-sm text-warn">Hoàn tất thao tác hoặc lưu/hủy bản đang sửa trước khi tải tệp.</p>:null}
 </section>
}
