'use client'
import { useEffect,useRef,useState } from 'react'
import type { ArtifactVersion } from '@/lib/projects/schema'
import { artifactVersionSchema } from '@/lib/projects/schema'
import { Button } from './ui/button'

export function ArtifactHistory({projectId,item,revision}:{projectId:string;item:ArtifactVersion;revision:number}){
 const [open,setOpen]=useState(false),[items,setItems]=useState<ArtifactVersion[]|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 const request=useRef<AbortController|null>(null)
 useEffect(()=>{setItems(null);setError('')},[projectId,item.key,item.systemId,revision])
 useEffect(()=>{
  if(!open)return
  const controller=new AbortController();request.current=controller
  const query=new URLSearchParams({view:'history',systemId:String(item.systemId),key:item.key})
  void fetch(`/api/projects/${encodeURIComponent(projectId)}?${query}`,{cache:'no-store',signal:controller.signal}).then(async response=>{
   const data=await response.json();if(!response.ok)throw Error(data.error??'Không đọc được lịch sử.')
   const parsed=artifactVersionSchema.array().parse(data.artifacts)
   if(!controller.signal.aborted){setItems(parsed);setError('')}
  }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Không tải được lịch sử.')})
  return()=>{controller.abort();request.current=null}
 },[open,projectId,item.key,item.systemId,revision,retry])
 return <details className="mt-4 rounded-lg border border-line2 p-3" onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary className="cursor-pointer text-sm font-medium">Xem lịch sử phiên bản</summary>
  {error?<div role="alert" className="mt-3 text-sm text-warn">{error}<Button variant="outline" className="ml-3 min-h-11" onClick={()=>setRetry(x=>x+1)}>Thử tải lịch sử</Button></div>:items===null?<p role="status" className="mt-3 text-sm text-mute">Đang tải lịch sử…</p>:<div className="mt-3 space-y-3">{items.map(a=><div key={a.id} className="rounded-lg border border-line2 p-3"><p className="text-xs text-mute">Bản {a.version} · {a.status==='stale'?'đã thay thế / lỗi thời':a.status==='approved'?'đã duyệt':'bản nháp'} · {a.mode==='openrouter'?'AI':'mẫu'}</p><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-mute">{a.content}</pre></div>)}</div>}
 </details>
}
