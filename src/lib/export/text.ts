import type { Project,ArtifactVersion } from '../projects/schema'
import { currentArtifacts,approved } from '../workflow/selectors'
import { commercialFacts } from '../ai/grounding'
import { ProjectError } from '../projects/repository'
const names=['Sản phẩm Win','Kênh Video AI','Chuyển đổi','Giao hàng & CSKH','Quản trị']
function approvalLabel(p:Project,a:ArtifactVersion){
 const gate=a.systemId===1?1:a.systemId<=3?2:null
 if(a.status==='approved')return gate&&approved(p,gate)?'Đã duyệt · đúng bộ phiên bản hiện hành':'Đã duyệt trước đây · bộ hiện tại cần duyệt lại'
 return 'Bản nháp · cần kiểm tra trước khi sử dụng'
}
export function exportText(p:Project,artifactId?:string):string{
 const all=currentArtifacts(p),items=artifactId?all.filter(a=>a.id===artifactId):all
 if(!items.length)throw new ProjectError('CONFLICT',artifactId?'Nội dung đã thay đổi hoặc không còn hiện hành. Tải lại trang và chọn bản mới.':'Chưa có nội dung hiện hành để tải TXT.')
 const header=['THÀNH PHẨM NỘI DUNG · MISSION CONTROL','Dự án: '+p.name,'Phiên bản đề bài: '+p.briefVersion,'Bản lưu dự án: '+p.revision,'Thời điểm bản lưu (UTC): '+p.updatedAt,'Phạm vi: '+(artifactId?'Một nội dung hiện hành':'Toàn bộ '+items.length+' nội dung hiện hành'),'Tệp chữ để chủ ứng dụng kiểm tra; chưa có bài đăng, email hay dịch vụ nào được gửi ra ngoài.','', 'DỮ KIỆN DO NGƯỜI DÙNG CUNG CẤP','Ngách: '+p.brief.niche,'Khách hàng: '+p.brief.audience,commercialFacts(p.brief),'Thương hiệu: '+(p.brief.brand||'Chưa bổ sung'),'Liên hệ: '+(p.brief.contact||'Chưa bổ sung'),'Nguồn tham khảo do người dùng cung cấp: '+(p.brief.sources||'Chưa bổ sung')]
 const sections=items.map(a=>['='.repeat(64),a.title,'Hệ thống: '+names[a.systemId-1],'Phiên bản nội dung: '+a.version+' · đề bài '+a.briefVersion,'Trạng thái: '+approvalLabel(p,a),a.mode==='sample'?'Nguồn: Mẫu · chưa gọi AI thật':'Nguồn: AI qua OpenRouter · model '+(a.modelId??'Không ghi nhận'),...(a.kind==='video-script'?['Kịch bản video dạng chữ và caption; không phải tệp video MP4.']:[]),...(a.criticalGaps.length?['Thông tin cần bổ sung: '+a.criticalGaps.join(', ')]:[]),'',a.content].join('\r\n'))
 return [...header,'',...sections].join('\r\n')+'\r\n'
}
