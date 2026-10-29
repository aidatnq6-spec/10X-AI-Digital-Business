import { test,expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { icaPreset } from '../../src/lib/projects/ica-preset'
test('backup catalog reloads immediately when project arrival cancels its first request',async({page,request})=>{
 const {project}=await (await request.post('/api/projects',{headers:{origin:'http://127.0.0.1:3201'},data:{name:'Catalog race',brief:icaPreset,requestId:randomUUID()}})).json()
 await page.addInitScript(id=>localStorage.setItem('mission-control.active-project.v1',id),project.id)
 let started!:()=>void,reads=0;const firstRead=new Promise<void>(resolve=>{started=resolve})
 await page.route('**/api/backups',async route=>{if(route.request().method()!=='GET')return route.continue();reads++;if(reads===1){started();await new Promise(r=>setTimeout(r,800))}await route.continue().catch(()=>{})})
 await page.route('**/api/projects?view=summary',async route=>{await firstRead;await new Promise(r=>setTimeout(r,50));await route.continue()})
 await page.goto('/#he-thong-1')
 const panel=page.getByTestId('backup-panel');await expect(panel).toContainText('Sao lưu thành công gần nhất')
 expect(reads).toBeGreaterThanOrEqual(2)
})
