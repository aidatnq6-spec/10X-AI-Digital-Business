import type { Brief } from './schema'

// User-confirmed sales terms, not a claim of verified technical compatibility.
export const icaPreset: Brief = {
  niche:'Chữ ký số dịch vụ công Kho bạc Nhà nước',
  audience:'Kế toán ở Đà Nẵng', product:'Chữ ký số', supplier:'ICA',
  acquisition:'new', vat:'included', usbToken:'included',
  brand:'', contact:'', notes:'', sources:'',
  offers:[
    {id:'ica-1-year',name:'Gói 1 năm',priceVnd:1792800,durationMonths:12,bonusMonths:0},
    {id:'ica-2-years',name:'Gói 2 năm',priceVnd:2690000,durationMonths:24,bonusMonths:0},
    {id:'ica-3-years',name:'Gói 3 năm',priceVnd:3080000,durationMonths:36,bonusMonths:6},
  ],
}