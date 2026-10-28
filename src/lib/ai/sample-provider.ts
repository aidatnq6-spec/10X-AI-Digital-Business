import type { Brief, Job } from '../projects/schema'
import { channels, validateOutput, jobOutputKeys, type OutputItem } from './artifact-schemas'
import { commercialFacts, contactPlaceholder } from './grounding'
export interface WorkflowProvider {generate(job:Job):Promise<OutputItem[]>}
export function buildSampleOutput(stage:number,b:Brief,upstream:Job['inputArtifacts']):OutputItem[]{
 const facts=commercialFacts(b),cta=b.contact?`Liên hệ: ${b.contact}`:contactPlaceholder
 const make=(key:string,title:string,kind:OutputItem['kind'],content:string,channel:OutputItem['channel']=null):OutputItem=>({key,title,kind,channel,content,criticalGaps:content.includes(contactPlaceholder)?['contact']:[]})
 const context=`Ngách: ${b.niche}\nKhách hàng: ${b.audience}\nSản phẩm: ${b.product}`
 const foundation=upstream.find(a=>a.systemId===1)?.title??'Đề bài người dùng'
 if(stage===1)return [make('offer','Định vị và bộ chào bán','offer',`${context}\n\nĐịnh vị đề xuất: cung cấp thông tin gói rõ ràng và hỗ trợ người mua xác nhận yêu cầu trước khi lựa chọn.\n\n${facts}\n\nChưa có căn cứ xác minh khả năng tương thích kỹ thuật hoặc thời gian xử lý. Không sử dụng bản mẫu này như cam kết của nhà cung cấp.`)]
 if(stage===2)return channels.map(c=>make(`video:${c}`,`Kịch bản ${c}`,'video-script',`${context}\nĐịnh hướng từ: ${foundation}\n\nHook: Bạn đang tìm hiểu ${b.product} cho công việc của mình?\nCảnh 1: Nêu nhu cầu của ${b.audience}.\nCảnh 2: Giới thiệu các lựa chọn dưới đây, không hứa tính năng chưa xác nhận.\n${facts}\nCảnh 3 / CTA: ${cta}\n\nCaption: Tìm hiểu gói phù hợp và xác nhận yêu cầu trước khi đăng ký.\nĐây là kịch bản chữ, chưa có video MP4.`,c))
 if(stage===3){
  const common=`${context}\n\n${facts}\n\n${cta}\nVui lòng xác nhận phạm vi hỗ trợ và yêu cầu kỹ thuật trước khi sử dụng.`
  return [...channels.map(c=>make(`post:${c}`,`Bài đăng ${c}`,'social-post',`Bạn cần tìm hiểu ${b.product}?\n${common}`,c)),make('landing','Nội dung trang giới thiệu','landing-copy',`Dịch vụ dành cho ${b.audience}\n${common}`),...[1,2,3].map(n=>make(`email:${n}`,`Email theo dõi ${n}`,'followup-email',`Tiêu đề: ${n===1?'Thông tin gói':n===2?'Bạn cần xác nhận điều gì?':'Trao đổi thêm khi bạn sẵn sàng'}\nChào anh/chị,\n${common}\nĐây là thư mẫu, chưa được gửi.`))]
 }
 if(stage===4)return [
  make('checklist','Checklist tiếp nhận đề xuất','checklist',`Xác nhận người yêu cầu và gói được chọn.\nĐối chiếu giá/điều kiện với bộ chào bán đã duyệt.\nXác minh danh mục hồ sơ với nhà cung cấp trước khi thu thập.\nKhông yêu cầu gửi mật khẩu/khóa bí mật qua nội dung mẫu.\nGhi nhận bàn giao sau khi nghiệp vụ được người phụ trách thực hiện.\n${facts}\nDanh mục này là đề xuất, chưa phải thủ tục ICA đã xác minh.`),
  make('confirmation','Mẫu xác nhận yêu cầu','confirmation',`Đã ghi nhận nhu cầu tìm hiểu ${b.product}. Người phụ trách cần xác nhận gói, hồ sơ và điều kiện thực tế trước khi thực hiện. Đây là mẫu tin nhắn, chưa được gửi.`),
  make('faq','10 câu hỏi thường gặp','faq',Array.from({length:10},(_,i)=>`${i+1}. ${['Có những gói nào?','Giá đã gồm VAT chưa?','Có thiết bị đi kèm không?','Có ưu đãi gì?','Đây là cấp mới hay gia hạn?','Cần chuẩn bị hồ sơ gì?','Thời gian xử lý bao lâu?','Có hỗ trợ hệ thống tôi dùng không?','Liên hệ hỗ trợ bằng cách nào?','Khi nào được xác nhận hoàn tất?'][i]}\n${i<5?'Đối chiếu thông tin trong bộ chào bán đã duyệt.':'Cần người phụ trách xác nhận; chưa có cam kết trong bản mẫu.'}`).join('\n\n')),
  make('escalation','Quy tắc chuyển người phụ trách','escalation','Chuyển người phụ trách khi khách hỏi tương thích kỹ thuật, hồ sơ pháp lý, thời gian xử lý, dữ liệu nhạy cảm, khiếu nại hoặc điều kiện chưa xác nhận. Không tự kích hoạt dịch vụ hay gửi yêu cầu ra ngoài.'),
 ]
 if(stage===5)return [make('management','Khung quản trị trống','management-template',`Cột đề xuất: Khách hàng | Liên hệ | Trạng thái | Gói | Số lượng | Đơn giá | Thành tiền | Ghi chú\nChưa có khách hàng hoặc doanh thu thực tế.\nQuy tắc: Thành tiền = số lượng hợp lệ × đơn giá gói được chọn.\nĐơn giá tham chiếu:\n${facts}\nBản mẫu văn bản; xuất CSV được bổ sung ở Mốc D.`)]
 throw new Error('Hệ thống không hợp lệ.')
}
export class SampleProvider implements WorkflowProvider {
 constructor(private readonly delayMs=700){}
 async generate(job:Job){
  if(!job.inputBrief)throw new Error('Thiếu snapshot đề bài.')
  if(this.delayMs)await new Promise(r=>setTimeout(r,this.delayMs))
  const keys=jobOutputKeys(job)
  return validateOutput(job.systemId,buildSampleOutput(job.systemId,job.inputBrief,job.inputArtifacts).filter(a=>keys.includes(a.key)),keys)
 }
}