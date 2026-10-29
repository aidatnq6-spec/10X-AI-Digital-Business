import { test,expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { icaPreset } from '../../src/lib/projects/ica-preset'
const origin='http://127.0.0.1:3201'
test('owner downloads Vietnamese TXT, Excel CSV and guide without calling AI or changing saved data',async({page,request})=>{
 const created=await request.post('/api/projects',{headers:{origin},data:{name:'ICA tải thành phẩm',brief:icaPreset,requestId:randomUUID()}})
 const {project}=await created.json()
 await request.post('/api/projects/'+project.id+'/commands',{headers:{origin},data:{type:'start',requestId:randomUUID()}})
 const read=async()=>(await (await request.get('/api/projects/'+project.id)).json()).project
 await expect.poll(async()=>(await read()).status).toBe('waiting_approval')
 const before=await read()
 await page.addInitScript(id=>localStorage.setItem('mission-control.active-project.v1',id),project.id)
 await page.goto('/#he-thong-1')
 const panel=page.getByTestId('export-panel')
 async function get(name:string){
  const event=page.waitForEvent('download')
  await panel.getByRole('button',{name,exact:true}).click()
  const file=await event,path=await file.path()
  expect(path).toBeTruthy()
  return {name:file.suggestedFilename(),bytes:await readFile(path!)}
 }
 const txt=await get('Tải toàn bộ TXT')
 expect(txt.name).toMatch(/\.txt$/);expect(txt.bytes.toString('utf8')).toContain('ICA tải thành phẩm');expect(txt.bytes.toString('utf8')).toContain('1.792.800');expect(txt.bytes.toString('utf8')).toContain('Nguồn: Mẫu')
 const csv=await get('Tải mẫu quản trị CSV trống')
 expect([...csv.bytes.subarray(0,3)]).toEqual([239,187,191])
 expect(csv.bytes.toString('utf8')).toContain('Khách hàng')
 expect(csv.bytes.toString('utf8').split('\r\n')).toHaveLength(2)
 const guide=await get('Tải hướng dẫn CSV (TXT)')
 expect(guide.bytes.toString('utf8')).toContain('=E2*F2');expect(guide.bytes.toString('utf8')).toContain('3.080.000')
 const card=page.locator('summary').filter({hasText:/^Định vị và bộ chào bán /}).locator('..')
 if(await card.getAttribute('open')===null) await card.locator(':scope > summary').click()
 const event=page.waitForEvent('download')
 await card.getByRole('button',{name:'Tải TXT nội dung này',exact:true}).click()
 const single=await event
 expect((await readFile((await single.path())!,'utf8'))).toContain('Phạm vi: Một nội dung hiện hành')
 expect(await read()).toEqual(before)
 await panel.screenshot({path:'.local/e2e-results/milestone-d-exports-desktop.png'})
 await page.setViewportSize({width:390,height:844})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await panel.screenshot({path:'.local/e2e-results/milestone-d-exports-mobile.png'})
})
