import type { Brief } from '../projects/schema'
export const contactPlaceholder='[CẦN BỔ SUNG LIÊN HỆ]'
export const genericCta='Gửi tin nhắn cho người bán để được tư vấn và xác nhận điều kiện gói.'
export function commercialFacts(b:Brief):string {
 const form={new:'Cấp mới',renewal:'Gia hạn',other:'Hình thức khác',unspecified:'Hình thức: chưa xác định'}[b.acquisition]
 const rows=b.offers.map(o=>`${o.name}: ${o.priceVnd.toLocaleString('vi-VN')} VND${o.durationMonths?` · ${o.durationMonths} tháng chính`:''}${o.bonusMonths?` · tặng thêm ${o.bonusMonths} tháng`:''}`)
 return [b.product,`Nhà cung cấp: ${b.supplier||'chưa bổ sung'}`,form,...rows,b.vat==='included'?'Đã bao gồm VAT':b.vat==='excluded'?'Chưa bao gồm VAT':'VAT: chưa xác định',b.usbToken==='included'?'Đã bao gồm USB Token':b.usbToken==='excluded'?'Chưa bao gồm USB Token':b.usbToken==='not_applicable'?'USB Token: không áp dụng':'USB Token: chưa xác định',b.notes?`Điều kiện do người dùng cung cấp: ${b.notes}`:'Điều kiện khác: chưa bổ sung'].join('\n')
}
export function gapsForContent(content:string):string[]{return content.includes(contactPlaceholder)?['contact']:[]}