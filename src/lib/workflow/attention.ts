import type { Project } from '../projects/schema'
type Attention={kind:'reconciliation'|'approval'|'paused'|'worker'|'failure'|'budget';title:string;detail:string;next:string}
export function projectAttention(p:Project,online:boolean|null):Attention|null {
 if(p.jobs.some(j=>j.status==='needs_reconciliation'))return {kind:'reconciliation',title:'Cần đối chiếu công việc bị gián đoạn',detail:'Kết quả một lượt gửi chưa được xác định. Phần đã lưu vẫn được giữ.',next:p.jobs.some(j=>j.status==='needs_reconciliation'&&j.mode==='openrouter')?'Kiểm tra kết quả và chi phí ở OpenRouter, rồi dùng phần đối chiếu bên dưới. Không gửi lại tự động.':'Kiểm tra kết quả bước mẫu đã lưu, rồi dùng nút cho phép chạy lại bước mẫu bên dưới khi bạn sẵn sàng.'}
 if(p.jobs.some(j=>j.mode==='openrouter'&&!['dispatching','running'].includes(j.status)&&j.sentAt&&j.usage?.costUsd==null))return {kind:'reconciliation',title:'Chưa xác định được chi phí AI',detail:'Khoản dự phòng vẫn được giữ để tránh chi vượt hạn mức.',next:'Đối chiếu chi phí ở mục ngân sách trước khi tiếp tục.'}
 if(p.status==='waiting_approval')return {kind:'approval',title:`Đang chờ duyệt ${p.workflow.gate??''}`.trim(),detail:'Kết quả đã lưu, worker sẽ giữ checkpoint tại đây.',next:'Đọc và chỉnh nội dung ở điểm duyệt bên dưới, sau đó chủ động xác nhận.'}
 if(online===false&&['queued','running'].includes(p.status))return {kind:'worker',title:'Chưa kết nối được worker',detail:'Giao diện chưa xác nhận được tiến trình xử lý. Không tự gửi thêm tác vụ.',next:'Mở lại shortcut 10X AI Digital Business để khởi động đúng worker, rồi kiểm tra lại kết nối.'}
 if(p.status==='failed'||p.workflow.error){
  const detail=p.workflow.error??'Công việc chưa hoàn thành; dữ liệu đã lưu vẫn còn.'
  const budget=/hạn mức|ngân sách|dự toán|token/i.test(detail)
  return {kind:budget?'budget':'failure',title:budget?'Cần kiểm tra hạn mức AI':'Cần xử lý trước khi tiếp tục',detail,next:budget?'Kiểm tra model, số lượt, token và ngân sách đã lưu. Chỉ tăng hạn mức nếu bạn đồng ý chi phí.':'Kiểm tra thông báo, kết nối và đầu vào. Sau khi xử lý, chủ động tiếp tục từ checkpoint; không cần chạy lại toàn bộ.'}
 }
 if(p.status==='paused')return {kind:'paused',title:'Đã tạm dừng tại checkpoint',detail:'Các nội dung và phiên bản đã lưu vẫn được giữ.',next:p.execution.scope==='step'?'Chọn bước tiếp theo hoặc chuyển sang cả chuỗi khi bạn sẵn sàng.':'Bấm Tiếp tục từ checkpoint khi bạn sẵn sàng. Lượt AI mới vẫn cần đáp ứng hạn mức.'}
 return null
}
