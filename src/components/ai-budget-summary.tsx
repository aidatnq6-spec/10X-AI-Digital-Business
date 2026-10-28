import type { Project } from '@/lib/projects/schema'
import { budgetSnapshot } from '@/lib/ai/limits'
const money=(n:number)=>n.toFixed(6)+' USD'
export function AiBudgetSummary({project}:{project:Project}){
 const config=project.aiConfig
 if(!config||project.workflow.mode!=='openrouter')return null
 const b=budgetSnapshot(config,project.jobs)
 const cells=[['Ngân sách đã lưu',money(config.budgetUsd)],['Đã dùng / đã ghi nhận',money(b.spentUsd)],['Giữ cho phí chưa rõ',money(b.reservedUsd)],['Còn có thể dùng',money(b.remainingUsd)],['Dự phòng bước tiếp theo',money(b.nextStepUsd)]]
 return <section aria-label="Ngân sách AI đã lưu" data-testid="ai-budget" className="my-4 rounded-xl border border-line2 bg-background/50 p-4">
  <h3 className="font-semibold">Ngân sách AI · cấu hình đã lưu</h3>
  <p className="mt-2 break-words text-sm text-mute">Model đang áp dụng: {config.modelId} · Lượt đã gửi: {b.calls}/{config.maxCalls}</p>
  <dl className="my-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{cells.map(([label,value])=><div key={label} className="min-w-0 rounded-lg border border-line2 p-3"><dt className="text-xs text-mute">{label}</dt><dd className="mt-2 break-words font-mono text-sm">{value}</dd></div>)}</dl>
  <p className="text-xs leading-relaxed text-mute">Provider xác nhận: {money(b.actualUsd)} · Bạn tự đối chiếu: {money(b.estimatedUsd)}. Phần tự đối chiếu chưa được provider xác nhận. Dự phòng là mức ước tính theo giới hạn token, chưa phải phí đã thu.</p>
  <p role="status" className={`mt-3 text-sm ${b.reason?'text-warn':'text-ok'}`}>
   {b.reason==='unresolved'?`Chưa thể gửi lượt tiếp theo: còn ${b.unresolved} lượt chưa rõ phí. Đối chiếu bên dưới trước; không nhập ngân sách vào ô chi phí thực tế.`:b.reason==='calls'?'Đã hết số lượt cho phép. Tăng giới hạn số lần gọi và lưu cấu hình nếu muốn tiếp tục.':b.reason==='budget'?`Chưa đủ ngân sách cho lượt tiếp theo: còn ${money(b.remainingUsd)}, cần dự phòng ${money(b.nextStepUsd)}, thiếu ${money(b.shortfallUsd)}. Kiểm tra khoản tự đối chiếu hoặc điều chỉnh hạn mức rồi lưu cấu hình.`:'Ngân sách đủ dự phòng cho một lượt tiếp theo. Các điều kiện về đề bài, duyệt nội dung và kết nối vẫn được kiểm tra khi chạy.'}
  </p>
  {b.overBudgetUsd>0?<p className="mt-2 text-sm text-warn">Phí đã ghi nhận vượt ngân sách đã lưu {money(b.overBudgetUsd)}.</p>:null}
  <p className="mt-3 text-xs text-mute">Các số trên tính theo cấu hình đã lưu, gồm cả lần gọi lại. Lưu cấu hình không tự chạy AI.</p>
 </section>
}
