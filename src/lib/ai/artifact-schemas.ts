import { z } from 'zod'
import type { Job } from '../projects/schema'
export const outputItemSchema=z.object({key:z.string().min(1).max(100),title:z.string().min(1).max(300),kind:z.enum(['offer','video-script','social-post','landing-copy','followup-email','checklist','confirmation','faq','escalation','management-template']),channel:z.enum(['Facebook','TikTok','Zalo','YouTube Shorts']).nullable(),content:z.string().min(1).max(40000),criticalGaps:z.array(z.string()).max(20)}).strict()
export type OutputItem=z.infer<typeof outputItemSchema>
export const channels=['Facebook','TikTok','Zalo','YouTube Shorts'] as const
export function expectedKeys(stage:number):string[]{
 if(stage===1)return ['offer']
 if(stage===2)return channels.map(c=>`video:${c}`)
 if(stage===3)return [...channels.map(c=>`post:${c}`),'landing','email:1','email:2','email:3']
 if(stage===4)return ['checklist','confirmation','faq','escalation']
 if(stage===5)return ['management']
 throw new Error('Hệ thống không hợp lệ.')
}
export function jobOutputKeys(job:Job):string[]{
 const keys=job.outputKeys??expectedKeys(job.systemId)
 if(!keys.length||new Set(keys).size!==keys.length||keys.some(k=>!expectedKeys(job.systemId).includes(k)))throw new Error('Phạm vi kết quả không hợp lệ.')
 return keys
}
export function validateOutput(stage:number,value:unknown,keys=expectedKeys(stage)):OutputItem[]{
 const items=z.array(outputItemSchema).max(12).parse(value)
 if(!keys.length||new Set(keys).size!==keys.length||keys.some(k=>!expectedKeys(stage).includes(k)))throw new Error('Phạm vi kết quả không hợp lệ.')
 const expected=[...keys].sort(),actual=items.map(a=>a.key).sort()
 if(JSON.stringify(expected)!==JSON.stringify(actual))throw new Error('Kết quả không đủ thành phần hoặc trùng mã.')
 const kinds:Record<number,string[]>= {1:['offer'],2:['video-script'],3:['social-post','landing-copy','followup-email'],4:['checklist','confirmation','faq','escalation'],5:['management-template']}
 if(items.some(i=>!kinds[stage]?.includes(i.kind)))throw new Error('Loại kết quả không đúng hệ thống.')
 for(const item of items){
  const channel=stage===2?item.key.slice(6):stage===3&&item.key.startsWith('post:')?item.key.slice(5):null
  const kind=stage===1?'offer':stage===2?'video-script':stage===3?item.key.startsWith('post:')?'social-post':item.key==='landing'?'landing-copy':'followup-email':stage===4?item.key: 'management-template'
  if(item.channel!==channel||item.kind!==kind)throw new Error('Loại hoặc kênh của thành phẩm không khớp mã kết quả.')
 }
 return items
}