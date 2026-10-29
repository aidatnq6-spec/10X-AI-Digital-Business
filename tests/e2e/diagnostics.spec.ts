import { test,expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { icaPreset } from '../../src/lib/projects/ica-preset'
const origin='http://127.0.0.1:3201'
test('error reference remains visible with draft; lazy local log shows code time and failed step',async({page,request})=>{
 const created=await request.post('/api/projects',{headers:{origin},data:{name:'Diagnostics UI',brief:icaPreset,requestId:randomUUID()}}),{project}=await created.json()
 await page.addInitScript(id=>localStorage.setItem('mission-control.active-project.v1',id),project.id)
 const id=randomUUID(),at=new Date().toISOString(),event={version:1,id,at,code:'FS_EPERM',source:'web',operation:'project.update',step:'repository.commit',pid:1,projectId:project.id,errorType:'Error',systemCode:'EPERM',syscall:'rename'}
 let reads=0,commands=0
 await page.route('**/api/diagnostics',route=>{reads++;return route.fulfill({json:{events:[event]}})})
 await page.route(`**/api/projects/${project.id}/commands`,route=>{commands++;return route.abort()})
 await page.route(`**/api/projects/${project.id}`,route=>route.request().method()==='PATCH'?route.fulfill({status:500,json:{error:`Không lưu được dữ liệu. Mã lỗi FS_EPERM · ${at} · Bước repository.commit · Mã đối chiếu ${id}`,code:'FS_EPERM',diagnostic:{...event,recorded:true}}}):route.continue())
 await page.goto('/#he-thong-1')
 const input=page.getByLabel('Sản phẩm / dịch vụ *',{exact:true});await input.fill('Bản nháp giữ lại sau lỗi')
 await page.getByRole('button',{name:'Lưu đề bài',exact:true}).click()
 await expect(page.getByRole('alert').filter({hasText:id})).toBeVisible();await expect(input).toHaveValue('Bản nháp giữ lại sau lỗi')
 const panel=page.getByTestId('diagnostics-panel');expect(reads).toBe(0)
 await panel.locator('summary').click();await expect(panel).toContainText(id);await expect(panel).toContainText('Chốt snapshot');await expect(panel).toContainText('EPERM');expect(reads).toBe(1)
 await panel.getByRole('button',{name:'Tải lại nhật ký lỗi',exact:true}).click();await expect.poll(()=>reads).toBe(2);expect(commands).toBe(0)
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await panel.screenshot({path:'.local/e2e-results/diagnostics-mobile.png'})
 expect((await (await request.get('/api/projects/'+project.id)).json()).project.brief.product).toBe(icaPreset.product)
})
