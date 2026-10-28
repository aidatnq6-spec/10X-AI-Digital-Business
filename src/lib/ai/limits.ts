import type { LiveConfig } from './config-schema'
import type { Job } from '../projects/schema'
export function reservationUsd(config:LiveConfig){return Math.ceil((config.maxInputTokens*config.quote.promptPerToken+config.maxOutputTokens*config.quote.completionPerToken)*1e9)/1e9}
export function usageTotals(jobs:Job[]){
 const live=jobs.filter(j=>j.mode==='openrouter'&&j.sentAt!==null)
 const actual=live.reduce((sum,j)=>sum+(j.usage?.status==='actual'&&j.usage.costUsd!==null?j.usage.costUsd:0),0)
 const estimated=live.reduce((sum,j)=>sum+(j.usage?.status==='estimated'&&j.usage.costUsd!==null?j.usage.costUsd:0),0)
 const unresolved=live.filter(j=>!j.usage||j.usage.costUsd===null)
 return {calls:live.length,actualUsd:actual,estimatedUsd:estimated,unresolved:unresolved.length,reservedUsd:unresolved.reduce((sum,j)=>sum+j.reservedCostUsd,0)}
}
export function checkBudget(config:LiveConfig,jobs:Job[]){
 const totals=usageTotals(jobs)
 if(totals.unresolved)throw new Error('Cần đối chiếu chi phí chưa rõ trước khi dùng tiếp ngân sách AI.')
 if(totals.calls>=config.maxCalls)throw new Error('Đã chạm giới hạn số lần gọi AI của dự án. Điều chỉnh cấu hình trước khi tiếp tục.')
 if(totals.actualUsd+totals.estimatedUsd+totals.reservedUsd+reservationUsd(config)>config.budgetUsd+1e-10)throw new Error(`Ngân sách dự toán còn lại không đủ cho bước tiếp theo. Còn ${Math.max(0,config.budgetUsd-totals.actualUsd-totals.estimatedUsd-totals.reservedUsd).toFixed(6)} USD; cần dự phòng ${reservationUsd(config).toFixed(6)} USD. Kiểm tra khoản tự đối chiếu hoặc điều chỉnh hạn mức và lưu cấu hình rồi tiếp tục.`)
}
export function validateConfig(config:LiveConfig){
 if(config.maxInputTokens+config.maxOutputTokens>config.quote.contextLength||config.maxOutputTokens>config.quote.maxCompletionTokens)throw new Error('Giới hạn token vượt khả năng model. Giảm đầu vào hoặc đầu ra.')
 if(Date.now()-Date.parse(config.quote.asOf)>86400000)throw new Error('Báo giá model đã cũ. Tải lại danh sách và lưu cấu hình trước khi chạy.')
 if(reservationUsd(config)>config.budgetUsd)throw new Error('Ngân sách dự toán không đủ cho một bước với giới hạn token hiện tại.')
}
/** Saved configuration only. Pending charges stay reserved until reconciled. */
export function budgetSnapshot(config:LiveConfig,jobs:Job[]){
 const totals=usageTotals(jobs),round=(n:number)=>Math.round(n*1e9)/1e9
 const spentUsd=round(totals.actualUsd+totals.estimatedUsd)
 const balance=round(config.budgetUsd-spentUsd-totals.reservedUsd)
 const nextStepUsd=reservationUsd(config)
 const shortfallUsd=Math.max(0,round(nextStepUsd-balance))
 const reason=totals.unresolved?'unresolved':totals.calls>=config.maxCalls?'calls':shortfallUsd>1e-10?'budget':null
 return {...totals,spentUsd,remainingUsd:Math.max(0,balance),overBudgetUsd:Math.max(0,round(spentUsd-config.budgetUsd)),nextStepUsd,shortfallUsd,reason}
}
