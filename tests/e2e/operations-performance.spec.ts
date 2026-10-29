import { test,expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { icaPreset } from '../../src/lib/projects/ica-preset'
const origin='http://127.0.0.1:3201'
async function setup(page:any,request:any){
 const r=await request.post('/api/projects',{headers:{origin},data:{name:'Operations test',brief:icaPreset,requestId:randomUUID()}})
 const {project}=await r.json()
 await page.addInitScript((id:string)=>localStorage.setItem('mission-control.active-project.v1',id),project.id)
 await page.goto('/#he-thong-1');await expect(page.getByLabel('Chọn đề bài đã lưu',{exact:true})).toHaveValue(project.id)
 return project
}
test('conditional sync survives offline, preserves draft and suspends while hidden',async({page,request})=>{
 const p=await setup(page,request),url=`**/api/projects/${p.id}?view=workspace`
 const label=page.getByLabel('Sản phẩm / dịch vụ *',{exact:true})
 await label.fill('Bản nháp cần giữ')
 await page.route(url,route=>route.abort())
 await page.getByRole('button',{name:'Kiểm tra đồng bộ',exact:true}).click()
 await expect(page.getByTestId('sync-status')).toContainText('Mất kết nối')
 await expect(label).toHaveValue('Bản nháp cần giữ')
 await page.unroute(url)
 const unchanged=page.waitForResponse(r=>r.url().includes(`/api/projects/${p.id}?view=workspace`)&&r.status()===304)
 await page.getByRole('button',{name:'Thử đồng bộ lại',exact:true}).click();await unchanged
 await expect(label).toHaveValue('Bản nháp cần giữ')
 let reads=0;page.on('request',r=>{if(r.url().includes(`/api/projects/${p.id}?view=workspace`))reads++})
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'))})
 const count=reads
 await page.clock.install();await page.clock.fastForward(60000);expect(reads).toBe(count)
 const foreground=page.waitForResponse(r=>r.url().includes(`/api/projects/${p.id}?view=workspace`))
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'))});await foreground
 expect((await (await request.get('/api/projects/'+p.id)).json()).project.brief.product).toBe(icaPreset.product)
})
test('download and import file restores paused copy and retains original',async({page,request})=>{
 const p=await setup(page,request),panel=page.getByTestId('portable-backup')
 const pending=page.waitForEvent('download');await panel.getByRole('button',{name:'Tải tệp sao lưu',exact:true}).click()
 const download=await pending,path=await download.path();expect(path).toBeTruthy()
 await expect(panel.getByRole('button',{name:'Tải tệp sao lưu',exact:true})).toBeEnabled()
 await panel.getByLabel('Chọn tệp sao lưu JSON',{exact:true}).setInputFiles(path!)
 const restore=panel.getByRole('button',{name:'Nhập tệp và khôi phục bản riêng',exact:true})
 await expect(restore).toBeDisabled();await panel.getByRole('checkbox').check();await restore.click()
 await expect(page.getByRole('heading',{name:'Đã tạm dừng',exact:true})).toBeVisible()
 const id=await page.getByLabel('Chọn đề bài đã lưu',{exact:true}).inputValue();expect(id).not.toBe(p.id)
 const restored=(await (await request.get('/api/projects/'+id)).json()).project
 expect(restored.status).toBe('paused');expect(restored.aiConfig).toBeNull();expect(restored.jobs).toHaveLength(0)
 expect((await (await request.get('/api/projects/'+p.id)).json()).project.brief).toEqual(p.brief)
})
