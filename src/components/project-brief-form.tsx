'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { FilePenLine, Plus, Save, Trash2 } from 'lucide-react'
import type { BriefDraft } from '@/lib/projects/schema'
import { Button } from '@/components/ui/button'

export type FieldIssue={path:string;message:string}
const inputClass='min-h-11 w-full rounded-xl border border-line2 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-mute focus:border-glow'
const fieldId=(path:string)=>`brief-${path.replaceAll('.','-')}`
function Field({path,label,issues,children,hint}:{path:string;label:string;issues:FieldIssue[];children:ReactNode;hint?:string}) {
  const error=issues.find(x=>x.path===path)
  return <div className="min-w-0"><label htmlFor={fieldId(path)} className="mb-1.5 block text-sm font-medium">{label}</label>{children}{hint?<p className="mt-1 text-xs text-mute">{hint}</p>:null}{error?<p id={`${fieldId(path)}-error`} className="mt-1 text-sm text-warn">{error.message}</p>:null}</div>
}
export function ProjectBriefForm({draft,onChange,onSave,onPreset,busy,issues,dirty}:{draft:BriefDraft;onChange:(next:BriefDraft)=>void;onSave:()=>void;onPreset:()=>void;busy:boolean;issues:FieldIssue[];dirty:boolean}) {
  const summary=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(issues.length) summary.current?.focus()},[issues])
  const text=(path:'niche'|'audience'|'product'|'supplier'|'brand'|'contact'|'notes'|'sources',label:string,placeholder:string,multiline=false)=>{
    const props={id:fieldId(path),value:draft[path],onChange:(event:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>onChange({...draft,[path]:event.target.value}),className:inputClass,placeholder,'aria-invalid':issues.some(x=>x.path===path),'aria-describedby':issues.some(x=>x.path===path)?`${fieldId(path)}-error`:undefined}
    return <Field key={path} path={path} label={label} issues={issues}>{multiline?<textarea {...props} rows={3}/>:<input {...props}/>}</Field>
  }
  const offerChange=(index:number,key:string,value:string|number|null)=>onChange({...draft,offers:draft.offers.map((o,i)=>i===index?{...o,[key]:value}:o)})
  const fieldProps=(path:string)=>({id:fieldId(path),'aria-invalid':issues.some(x=>x.path===path),'aria-describedby':issues.some(x=>x.path===path)?`${fieldId(path)}-error`:undefined})
  return <form onSubmit={event=>{event.preventDefault();onSave()}} noValidate>
    <fieldset disabled={busy} className="min-w-0 space-y-6 disabled:opacity-70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-display text-2xl font-semibold">Một đề bài cho cả 5 hệ thống</h3><p className="mt-1 max-w-xl text-sm text-mute">Nhập thông tin bạn muốn bán. Các tab còn lại sẽ dùng chung bản đã lưu.</p></div>
        <Button type="button" variant="outline" className="min-h-11" onClick={onPreset}><FilePenLine aria-hidden/>Điền mẫu ICA</Button>
      </div>
      {issues.length?<div ref={summary} role="alert" tabIndex={-1} className="rounded-xl border border-warn/50 p-4 text-warn"><p className="font-semibold">Cần kiểm tra lại đề bài</p><ul className="mt-2 list-inside list-disc space-y-1">{issues.map((x,i)=><li key={`${x.path}-${i}`}><a className="underline" href={`#${fieldId(x.path)}`} onClick={event=>{event.preventDefault();const target=document.getElementById(fieldId(x.path));const details=target?.closest('details');if(details) details.open=true;target?.focus();target?.scrollIntoView({block:'center'})}}>{x.message}</a></li>)}</ul></div>:null}
      <div className="grid gap-4 sm:grid-cols-2">
        {text('niche','Ngách *','Ví dụ: chữ ký số dịch vụ công Kho bạc Nhà nước',true)}
        {text('audience','Bán cho ai? *','Ví dụ: kế toán ở Đà Nẵng',true)}
        <div className="sm:col-span-2">{text('product','Sản phẩm / dịch vụ *','Bạn muốn bán sản phẩm hoặc dịch vụ gì?')}</div>
      </div>
      <section aria-labelledby="offer-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 id="offer-heading" className="font-semibold">Giá bán muốn thử *</h4><p className="mt-1 text-xs text-mute">Nhập số nguyên VND, ví dụ 1792800. Thời hạn có thể bỏ trống nếu không áp dụng.</p></div><Button type="button" variant="outline" className="min-h-11" disabled={draft.offers.length>=12} onClick={()=>onChange({...draft,offers:[...draft.offers,{id:crypto.randomUUID(),name:'',priceVnd:null,durationMonths:null,bonusMonths:0}]})}><Plus aria-hidden/>Thêm gói</Button></div>
        {issues.find(x=>x.path==='offers')?<p id={fieldId('offers')} className="text-sm text-warn">{issues.find(x=>x.path==='offers')?.message}</p>:null}
        {draft.offers.map((offer,index)=><fieldset key={offer.id} className="rounded-2xl border border-line bg-background/50 p-4"><legend className="px-2 text-xs text-mute">Gói {index+1}</legend><div className="grid gap-3 sm:grid-cols-2">
          <Field path={`offers.${index}.name`} label="Tên gói *" issues={issues}><input {...fieldProps(`offers.${index}.name`)} className={inputClass} value={offer.name} onChange={e=>offerChange(index,'name',e.target.value)} placeholder="Ví dụ: Gói 1 năm"/></Field>
          <Field path={`offers.${index}.priceVnd`} label="Giá bán (VND) *" issues={issues}><input {...fieldProps(`offers.${index}.priceVnd`)} className={inputClass} type="number" inputMode="numeric" min={0} step={1} value={offer.priceVnd??''} onChange={e=>offerChange(index,'priceVnd',e.target.value===''?null:Number(e.target.value))} placeholder="1792800"/></Field>
          <Field path={`offers.${index}.durationMonths`} label="Thời hạn chính (tháng)" issues={issues}><input {...fieldProps(`offers.${index}.durationMonths`)} className={inputClass} type="number" inputMode="numeric" min={1} step={1} value={offer.durationMonths??''} onChange={e=>offerChange(index,'durationMonths',e.target.value===''?null:Number(e.target.value))} placeholder="Không áp dụng"/></Field>
          <Field path={`offers.${index}.bonusMonths`} label="Tặng thêm (tháng)" issues={issues}><input {...fieldProps(`offers.${index}.bonusMonths`)} className={inputClass} type="number" inputMode="numeric" min={0} step={1} value={offer.bonusMonths} onChange={e=>offerChange(index,'bonusMonths',e.target.value===''?0:Number(e.target.value))}/></Field>
        </div><div className="mt-2 flex justify-end"><Button type="button" variant="ghost" className="min-h-11" disabled={draft.offers.length===1} onClick={()=>onChange({...draft,offers:draft.offers.filter((_,i)=>i!==index)})} aria-label={`Xóa gói ${index+1}`}><Trash2 aria-hidden/>Xóa gói</Button></div></fieldset>)}
      </section>
      <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer py-1 font-semibold">Thông tin bổ sung <span className="font-normal text-mute">· có thể để trống</span></summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
        {text('supplier','Nhà cung cấp','Ví dụ: ICA')}
        <Field path="acquisition" label="Hình thức" issues={issues}><select {...fieldProps('acquisition')} className={inputClass} value={draft.acquisition} onChange={e=>onChange({...draft,acquisition:e.target.value as BriefDraft['acquisition']})}><option value="unspecified">Chưa xác định</option><option value="new">Cấp mới</option><option value="renewal">Gia hạn</option><option value="other">Khác</option></select></Field>
        <Field path="vat" label="VAT" issues={issues}><select {...fieldProps('vat')} className={inputClass} value={draft.vat} onChange={e=>onChange({...draft,vat:e.target.value as BriefDraft['vat']})}><option value="unspecified">Chưa xác định</option><option value="included">Đã bao gồm VAT</option><option value="excluded">Chưa bao gồm VAT</option></select></Field>
        <Field path="usbToken" label="USB Token" issues={issues}><select {...fieldProps('usbToken')} className={inputClass} value={draft.usbToken} onChange={e=>onChange({...draft,usbToken:e.target.value as BriefDraft['usbToken']})}><option value="unspecified">Chưa xác định</option><option value="included">Đã bao gồm USB Token</option><option value="excluded">Chưa bao gồm USB Token</option><option value="not_applicable">Không áp dụng</option></select></Field>
        {text('brand','Thương hiệu của bạn','Để trống nếu chưa có')}
        {text('contact','Thông tin liên hệ / CTA','Điện thoại, Zalo, email hoặc cách liên hệ')}
        {text('notes','Ưu đãi và điều kiện khác','Chỉ nhập thông tin đã được xác nhận',true)}
        {text('sources','Tài liệu / nguồn tham khảo','Đường dẫn hoặc nội dung đã xác minh',true)}
      </div></details>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5"><Button type="submit" className="min-h-11" disabled={busy||!dirty}><Save aria-hidden/>{busy?'Đang lưu…':'Lưu đề bài'}</Button><p className="text-xs text-mute">{dirty?'Có thay đổi chưa lưu.':'Bản đã lưu sẽ được dùng chung ở các tab.'}</p></div>
    </fieldset>
  </form>
}