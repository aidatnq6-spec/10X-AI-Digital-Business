'use client'
import { useRef,useState } from 'react'
import { Download,Upload } from 'lucide-react'
import { projectSchema,type Project } from '@/lib/projects/schema'
import { Button } from './ui/button'
export function PortableBackup({project,disabled,onBusy,onRestored}:{project:Project|null;disabled:boolean;onBusy:(v:boolean)=>void;onRestored:(p:Project)=>void}){
 const [working,setWorking]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[selected,setSelected]=useState<{name:string;data:unknown;projectName:string;requestId:string}|null>(null),[consent,setConsent]=useState(false)
 const generation=useRef(0),input=useRef<HTMLInputElement>(null)
 const blocked=disabled||working
 async function readFile(file:File|undefined){
  const current=++generation.current;setSelected(null);setConsent(false);setError('');setMessage('')
  if(!file)return
  try{
   if(file.size>32*1024*1024)throw Error('Tệp sao lưu vượt quá 32 MiB.')
   const data=JSON.parse(await file.text()),name=typeof data?.data?.name==='string'?data.data.name:'Chưa xác định'
   if(current===generation.current)setSelected({name:file.name,data,projectName:name.slice(0,2000),requestId:crypto.randomUUID()})
  }catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'Không đọc được tệp JSON.')}
 }
 async function execute(type:'download'|'import'){
  if(blocked||type==='download'&&!project||type==='import'&&(!selected||!consent))return
  setWorking(true);onBusy(true);setError('');setMessage('')
  try{
   if(type==='download'){
    const created=await fetch('/api/backups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'create',projectId:project!.id})})
    const data=await created.json();if(!created.ok)throw Error(data.error)
    const response=await fetch(`/api/backups/file?${new URLSearchParams({projectId:project!.id,backupId:data.backupId})}`,{cache:'no-store'})
    if(!response.ok)throw Error((await response.json()).error)
    const url=URL.createObjectURL(await response.blob()),anchor=document.createElement('a')
    anchor.href=url;anchor.download=`10x-backup-${data.backupId}.json`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)
    setMessage('Đã tạo tệp tải xuống. Kiểm tra thư mục tải xuống và lưu thêm trên ổ khác nếu cần.')
   }else{
    const response=await fetch('/api/backups/file',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({backup:selected!.data,requestId:selected!.requestId,acknowledgeRestore:true})})
    const data=await response.json();if(!response.ok)throw Error(data.error)
    onRestored(projectSchema.parse(data.project));setSelected(null);setConsent(false);if(input.current)input.current.value=''
    setMessage('Đã mở bản khôi phục riêng ở trạng thái tạm dừng. Dự án gốc được giữ nguyên.')
   }
  }catch(e){setError(e instanceof Error?e.message:'Không thực hiện được thao tác với tệp sao lưu.')}
  finally{setWorking(false);onBusy(false)}
 }
 return <div className="mt-5 rounded-xl border border-line2 p-4" data-testid="portable-backup">
  <h3 className="font-semibold">Sao lưu bằng tệp JSON</h3><p className="mt-2 text-sm text-mute">Tải dữ liệu đã lưu để giữ thêm ở thư mục hoặc ổ đĩa khác. Tệp có nội dung dự án; chọn nơi lưu phù hợp. Máy chủ kiểm tra checksum và cấu trúc trước khi khôi phục.</p>
  <div className="mt-3 flex flex-wrap items-center gap-3"><Button variant="outline" className="min-h-11" disabled={blocked||!project} onClick={()=>void execute('download')}><Download aria-hidden/>Tải tệp sao lưu</Button><label className="min-w-0 text-sm"><span className="mb-2 flex items-center gap-2"><Upload className="size-4" aria-hidden/>Chọn tệp sao lưu JSON</span><input ref={input} type="file" accept=".json,application/json" disabled={blocked} className="block w-full max-w-full text-sm" onChange={e=>void readFile(e.target.files?.[0])}/></label></div>
  {selected?<div className="mt-4 space-y-3 text-sm"><p className="break-words">Tệp: {selected.name} · Dự án: {selected.projectName}</p><label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 size-4 shrink-0" checked={consent} disabled={blocked} onChange={e=>setConsent(e.target.checked)}/>Tôi xác nhận nhập tệp thành bản khôi phục riêng, giữ nguyên dự án gốc và chưa chạy AI.</label><Button className="min-h-11 whitespace-normal" disabled={blocked||!consent} onClick={()=>void execute('import')}>Nhập tệp và khôi phục bản riêng</Button></div>:null}
  {error?<p role="alert" className="mt-3 text-sm text-warn">{error}</p>:null}{message?<p role="status" className="mt-3 text-sm text-ok">{message}</p>:null}
 </div>
}
