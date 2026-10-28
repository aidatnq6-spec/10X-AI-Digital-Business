import { z } from 'zod'
import type { Brief,Project } from '../projects/schema'
import { commercialFacts } from '../ai/grounding'
const rowSchema=z.object({customer:z.string().max(2000),contact:z.string().max(2000),status:z.string().max(2000),offerId:z.string(),quantity:z.number().int().positive().max(1000000),notes:z.string().max(12000)}).strict()
export type ManagementRow=z.infer<typeof rowSchema>
export function csvCell(value:string|number):string{
 if(typeof value==='number'&&!Number.isFinite(value))throw Error('Giá trị số không hợp lệ.')
 let text=String(value).replace(/\u0000/g,'')
 if(typeof value==='string'&&(/^[\s\u0000-\u0020\uFEFF]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text)))text="'"+text
 return '"'+text.replace(/"/g,'""')+'"'
}
export function managementCsv(brief:Brief,rows:ManagementRow[]=[]):string{
 const header=['Khách hàng','Liên hệ','Trạng thái','Gói','Số lượng','Đơn giá (VND)','Thành tiền (VND)','Ghi chú']
 const data=rows.map(raw=>{
  const row=rowSchema.parse(raw),offer=brief.offers.find(o=>o.id===row.offerId)
  if(!offer)throw Error('Gói đã chọn không tồn tại.')
  const total=offer.priceVnd*row.quantity
  if(!Number.isSafeInteger(total))throw Error('Thành tiền vượt giới hạn số nguyên an toàn.')
  return [row.customer,row.contact,row.status,offer.name,row.quantity,offer.priceVnd,total,row.notes].map(csvCell).join(',')
 })
 return '\uFEFF'+[header.map(csvCell).join(','),...data].join('\r\n')+'\r\n'
}
export function managementGuide(p:Pick<Project,'name'|'brief'|'briefVersion'>):string{
 return ['HƯỚNG DẪN MẪU QUẢN TRỊ CSV','Dự án: '+p.name,'Phiên bản đề bài: '+p.briefVersion,'','CSV hiện là mẫu trống: chỉ có tiêu đề cột, chưa có khách hàng, đơn hàng hoặc doanh thu thực tế.','Mở CSV bằng Excel với mã hóa UTF-8. Nếu cột chưa được tách, chọn dấu phân cách là dấu phẩy.','Trước khi nhập số điện thoại, đặt cột Liên hệ thành Text để giữ số 0 ở đầu.','Điền gói từ bảng giá dưới đây; số lượng phải là số nguyên dương; đơn giá và thành tiền dùng số nguyên VND, không thêm dấu phân cách trong ô số.','Tại cột G (Thành tiền), bạn có thể tự nhập công thức =E2*F2 sau khi đã kiểm tra số lượng ở E2 và đơn giá ở F2.','Công thức chỉ là hướng dẫn trong TXT; CSV tải về không chứa công thức hoạt động. Lưu thành .xlsx nếu muốn giữ công thức và định dạng.','Bảng giá/điều kiện dưới đây do người dùng cung cấp, chưa phải doanh thu hay số tiền đã thu:','',commercialFacts(p.brief)].join('\r\n')+'\r\n'
}
