'use client'
import { useEffect,useState } from 'react'
import { Settings2,RefreshCw } from 'lucide-react'
import type { Project } from '@/lib/projects/schema'
import { liveInputSchema,type ModelQuote } from '@/lib/ai/config-schema'
import { reservationUsd } from '@/lib/ai/limits'
import type { CommandAction } from './project-progress'
import { Button } from './ui/button'
const input='min-h-11 w-full rounded-xl border border-line2 bg-background px-3 py-2 text-sm'
export function OpenRouterSettings({project,busy,blocked,onAction,onDraftChange}:{project:Project;busy:boolean;blocked:boolean;onDraftChange:(dirty:boolean)=>void;onAction:(c:CommandAction)=>Promise<boolean>}){
 const saved=project.aiConfig
 const [models,setModels]=useState<ModelQuote[]>(saved?[saved.quote]:[])
 const [modelId,setModelId]=useState(saved?.modelId??'')
 const [maxCalls,setMaxCalls]=useState(saved?.maxCalls??8)
 const [maxInputTokens,setMaxInputTokens]=useState(saved?.maxInputTokens??64000)
 const [maxOutputTokens,setMaxOutputTokens]=useState(saved?.maxOutputTokens??12000)
 const [budgetUsd,setBudgetUsd]=useState(saved?.budgetUsd??1)
 const [consent,setConsent]=useState(false)
 const [keyConfigured,setKeyConfigured]=useState<boolean|null>(null)
 const [loading,setLoading]=useState(false),[error,setError]=useState('')
 useEffect(()=>{const controller=new AbortController();void fetch('/api/ai/options',{cache:'no-store',signal:controller.signal}).then(r=>r.json()).then(data=>setKeyConfigured(data.keyConfigured===true)).catch(()=>{});return()=>controller.abort()},[])
 async function load(){
  setLoading(true);setError('')
  try{const r=await fetch('/api/ai/options?models=1',{cache:'no-store'});const data=await r.json();setKeyConfigured(data.keyConfigured===true);if(!r.ok)throw new Error(data.error);setModels(data.models)}catch(e){setError(e instanceof Error?e.message:'Không tải được danh sách model.')}finally{setLoading(false)}
 }

 const dirty=saved?[modelId,maxCalls,maxInputTokens,maxOutputTokens,budgetUsd].some((v,i)=>v!==[saved.modelId,saved.maxCalls,saved.maxInputTokens,saved.maxOutputTokens,saved.budgetUsd][i]):Boolean(modelId)
 useEffect(()=>{onDraftChange(dirty)},[dirty,onDraftChange])
 function restoreSaved(){
  if(!saved)return
  setModelId(saved.modelId);setMaxCalls(saved.maxCalls);setMaxInputTokens(saved.maxInputTokens);setMaxOutputTokens(saved.maxOutputTokens);setBudgetUsd(saved.budgetUsd);setConsent(false);setError('')
  setModels(values=>values.some(q=>q.id===saved.modelId)?values:[saved.quote,...values])
 }
 const quote=models.find(m=>m.id===modelId)
 const locked=busy||blocked||project.jobs.some(j=>['dispatching','running','needs_reconciliation'].includes(j.status))
 const estimate=quote?reservationUsd({modelId,maxCalls,maxInputTokens,maxOutputTokens,budgetUsd,quote,consentAt:new Date().toISOString()}):null
 return <details className="my-5 rounded-xl border border-line2 p-4" data-testid="openrouter-settings"><summary className="flex cursor-pointer items-center gap-2 font-semibold"><Settings2 className="size-4" aria-hidden/>Kết nối OpenRouter · model & hạn mức</summary><div className="mt-4 space-y-4">
  <p className="text-sm text-mute">{keyConfigured===null?'Đang kiểm tra cấu hình key…':keyConfigured?'Đã có key trên máy chủ; tính hợp lệ sẽ được kiểm chứng khi gọi OpenRouter.':'Chưa có key. Điền OPENROUTER_API_KEY trong file .env.local của dự án mission-control-app. Không nhập key vào form này.'}</p>
  <Button type="button" variant="outline" className="min-h-11" disabled={loading||busy} onClick={()=>void load()}><RefreshCw aria-hidden/>{loading?'Đang tải…':'Tải model, giá và kiểm tra lại key'}</Button>
  {error?<p role="alert" className="text-sm text-warn">{error}</p>:null}
  <div role="status" className={`rounded-lg border p-3 text-sm ${dirty?'border-warn/40 text-warn':'border-line2 text-mute'}`}>
   {dirty?'Chưa lưu thay đổi · các ô bên dưới là bản đang sửa. Lưu cấu hình trước khi chạy AI.':saved?'Đã lưu · đang áp dụng cấu hình này cho lần chạy tiếp theo.':'Chưa có cấu hình AI đã lưu. Chọn model và hạn mức để thiết lập.'}
   {saved?<p className="mt-2 break-words text-xs">Bản đã lưu: {saved.modelId} · ngân sách {saved.budgetUsd} USD · {saved.maxCalls} lượt · đầu vào {saved.maxInputTokens} / đầu ra {saved.maxOutputTokens} token.</p>:null}
   {dirty&&saved?<Button type="button" variant="outline" className="mt-3 min-h-11" disabled={busy} onClick={restoreSaved}>Dùng lại cấu hình đã lưu</Button>:null}
  </div>
  <form className="space-y-4" noValidate onSubmit={e=>{e.preventDefault();const parsed=liveInputSchema.safeParse({modelId,maxCalls,maxInputTokens,maxOutputTokens,budgetUsd,acknowledgeCost:consent});if(!parsed.success){setError('Chọn model, nhập hạn mức hợp lệ và đánh dấu xác nhận chi phí.');return}setError('');void onAction({type:'configureAI',settings:parsed.data}).then(ok=>{if(ok)setConsent(false)})}}>
   <fieldset disabled={locked||loading} className="grid min-w-0 gap-4 sm:grid-cols-2">
    <div className="min-w-0 sm:col-span-2"><label htmlFor="ai-model" className="mb-2 block text-sm">Model OpenRouter</label><select id="ai-model" className={input} value={modelId} onChange={e=>{setModelId(e.target.value);const q=models.find(m=>m.id===e.target.value);if(q){const out=Math.min(maxOutputTokens,q.maxCompletionTokens,Math.floor(q.contextLength/3));setMaxOutputTokens(out);setMaxInputTokens(Math.max(8192,Math.min(maxInputTokens,q.contextLength-out)))}}}><option value="">Chọn model hỗ trợ JSON có cấu trúc</option>{models.map(m=><option key={m.id} value={m.id}>{m.name} · {m.id}</option>)}</select></div>
    <div><label htmlFor="ai-max-calls" className="mb-2 block text-sm">Tối đa số lần gọi cho dự án</label><input id="ai-max-calls" className={input} type="number" min={1} max={30} step={1} value={maxCalls} onChange={e=>setMaxCalls(Number(e.target.value))}/></div>
    <div><label htmlFor="ai-budget" className="mb-2 block text-sm">Ngân sách dự toán (USD)</label><input id="ai-budget" className={input} type="number" min={0.001} max={100} step="any" value={budgetUsd} onChange={e=>setBudgetUsd(Number(e.target.value))}/></div>
    <div><label htmlFor="ai-input" className="mb-2 block text-sm">Giới hạn đầu vào mỗi bước (token)</label><input id="ai-input" className={input} type="number" min={8192} max={200000} step={1} value={maxInputTokens} onChange={e=>setMaxInputTokens(Number(e.target.value))}/></div>
    <div><label htmlFor="ai-output" className="mb-2 block text-sm">Giới hạn đầu ra mỗi bước (token)</label><input id="ai-output" className={input} type="number" min={512} max={32000} step={1} value={maxOutputTokens} onChange={e=>setMaxOutputTokens(Number(e.target.value))}/></div>
    {quote?<p className="text-sm text-mute sm:col-span-2">Bản đang chọn — giá tham chiếu: đầu vào {(quote.promptPerToken*1e6).toLocaleString('vi-VN')} USD / triệu token; đầu ra {(quote.completionPerToken*1e6).toLocaleString('vi-VN')} USD / triệu token. Dự phòng mỗi bước theo bản đang chọn: {estimate?.toFixed(4)} USD. Máy chủ xác minh lại giá khi lưu.</p>:null}
    <p className="text-xs leading-relaxed text-mute sm:col-span-2">Hạn mức tính cho toàn dự án, gồm các lần gọi lại. Đầu vào dùng ước lượng bảo thủ theo kích thước văn bản. Ngân sách ứng dụng là giới hạn dự toán; để có trần thanh toán tại nhà cung cấp, đặt thêm hạn mức key trong OpenRouter. Đổi từ mẫu sang AI sẽ làm cũ kết quả mẫu và yêu cầu chạy lại từ đầu.</p>
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm sm:col-span-2"><input className="mt-1 size-4" type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Tôi đồng ý dùng model và hạn mức này cho các lượt AI có thể tính phí khi tôi bấm chạy hoặc tiếp tục.</label>
    <div className="flex flex-wrap gap-3 sm:col-span-2"><Button type="submit" className="min-h-11" disabled={!consent||!modelId}>Lưu cấu hình AI thật</Button>{project.workflow.mode==='openrouter'?<Button type="button" variant="outline" className="min-h-11" onClick={()=>void onAction({type:'setSampleMode'})}>Chuyển về chế độ mẫu</Button>:null}</div>
   </fieldset>
  </form>
 </div></details>
}