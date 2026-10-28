'use client'
import type { Run,System } from '@/lib/types'
import { fill } from '@/lib/fill'
import { Dialog,DialogContent,DialogDescription,DialogTitle } from '@/components/ui/dialog'
export function KitDialog({sys,run,index,onClose}:{sys:System;run:Run;index:number|null;onClose:()=>void}){
 const item=index===null?null:sys.kit[index]
 return <Dialog open={item!==null&&item!==undefined} onOpenChange={open=>{if(!open)onClose()}}><DialogContent>{item?<><DialogTitle>{fill(sys,run.inputs,item.name)}</DialogTitle><DialogDescription>Giao diện tham khảo cũ. Tạo nội dung và tải TXT/CSV tại quy trình dự án để dùng đúng bản đã lưu, hạn mức và hai điểm duyệt.</DialogDescription><ul className="mt-4 space-y-2 text-sm text-mute">{item.outline.map(line=><li key={line}>{fill(sys,run.inputs,line)}</li>)}</ul></>:null}</DialogContent></Dialog>
}