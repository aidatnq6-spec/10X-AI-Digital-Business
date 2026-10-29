import { test,expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { jobSchema } from '../../src/lib/projects/schema'
import { icaPreset } from '../../src/lib/projects/ica-preset'
const origin='http://127.0.0.1:3201'
test('OpenRouter settings require deliberate consent and save model limits without starting a paid job',async({page,request})=>{
 const result=await request.post('/api/projects',{headers:{origin},data:{name:'Cấu hình OpenRouter UI',brief:icaPreset,requestId:randomUUID()}})
 const {project}=await result.json()
 const quote={id:'test/structured',name:'Model kiểm thử',promptPerToken:0.000001,completionPerToken:0.000002,contextLength:100000,maxCompletionTokens:20000,asOf:new Date().toISOString()}
 await page.addInitScript(id=>localStorage.setItem('mission-control.active-project.v1',id),project.id)
 await page.route('**/api/ai/options*',route=>route.fulfill({json:{keyConfigured:false,models:route.request().url().includes('models=1')?[quote]:[]}}))
 const sent:any[]=[]
 await page.route(`**/api/projects/${project.id}/commands`,async route=>{
  const command=route.request().postDataJSON();sent.push(command)
  if(command.type!=='configureAI')return route.fulfill({status:409,json:{error:'Test không cho phép gửi request có phí.'}})
  const {acknowledgeCost,...settings}=command.settings
  return route.fulfill({json:{project:{...project,revision:project.revision+1,aiConfig:{...settings,quote,consentAt:new Date().toISOString()},workflow:{...project.workflow,mode:'openrouter'}}}})
 })
 await page.goto('/#he-thong-1')
 const settings=page.getByTestId('openrouter-settings')
 await settings.locator('summary').click()
 await expect(settings).toContainText('Chưa có key')
 await settings.getByRole('button',{name:'Tải model, giá và kiểm tra lại key'}).click()
 await settings.getByLabel('Model OpenRouter',{exact:true}).selectOption(quote.id)
 await expect(settings.getByRole('button',{name:'Lưu cấu hình AI thật'})).toBeDisabled()
 await expect(settings).toContainText('Chưa lưu thay đổi')
 await expect(page.getByRole('button',{name:'Bắt đầu chuỗi mẫu'})).toBeDisabled()
 await settings.getByRole('checkbox').check()
 await settings.getByRole('button',{name:'Lưu cấu hình AI thật'}).click()
 await expect(page.getByRole('heading',{name:'Sẵn sàng chạy AI thật'})).toBeVisible()
 await expect(settings).toContainText('Đã lưu · đang áp dụng')
 await expect(page.getByTestId('ai-budget')).toContainText('test/structured')
 expect(sent).toHaveLength(1);expect(sent[0].type).toBe('configureAI');expect(sent[0].settings.acknowledgeCost).toBe(true)
 expect(sent[0].settings).not.toHaveProperty('quote')
 await page.getByRole('button',{name:'Bắt đầu AI thật (có thể tính phí)'}).click()
 await expect(page.getByRole('region',{name:'Sản phẩm Win',exact:true}).getByRole('alert')).toContainText('Test không cho phép')
 await page.screenshot({path:'.local/e2e-results/milestone-c-settings.png',fullPage:true})
 const untouched=(await (await request.get(`/api/projects/${project.id}`)).json()).project
 expect(untouched.jobs).toHaveLength(0)
})

test('legacy generation endpoint is disabled and options do not return the API key',async({request})=>{
 const legacy=await request.post('/api/generate',{headers:{origin},data:{}})
 expect(legacy.status()).toBe(410)
 const options=await request.get('/api/ai/options')
 expect(options.status()).toBe(200)
 const data=await options.json();expect(typeof data.keyConfigured).toBe('boolean')
 expect(data).not.toHaveProperty('key');expect(data).not.toHaveProperty('apiKey');expect(data).not.toHaveProperty('OPENROUTER_API_KEY')
})
test('budget explains exhausted funds and unsaved settings never change the applied budget',async({page,request})=>{
 const created=await request.post('/api/projects',{headers:{origin},data:{name:'Ngân sách kiểm thử',brief:icaPreset,requestId:randomUUID()}})
 const {project}=await created.json()
 const quote={id:'test/saved',name:'Model đã lưu',promptPerToken:.000005,completionPerToken:.000025,contextLength:100000,maxCompletionTokens:20000,asOf:new Date().toISOString()}
 const config={modelId:quote.id,maxCalls:8,maxInputTokens:64000,maxOutputTokens:12000,budgetUsd:1,quote,consentAt:new Date().toISOString()}
 const snapshot={...project,revision:project.revision+1,status:'paused',workflow:{mode:'openrouter',stage:1,gate:null,error:null},aiConfig:config,jobs:[jobSchema.parse({id:randomUUID(),systemId:1,briefVersion:1,workflowEpoch:1,idempotencyKey:randomUUID(),mode:'openrouter',status:'failed',sentAt:new Date().toISOString(),reservedCostUsd:.62,providerRequestId:null,usage:{status:'estimated',inputTokens:null,outputTokens:null,costUsd:1}})]}
 await page.addInitScript(id=>localStorage.setItem('mission-control.active-project.v1',id),project.id)
 await page.route(`**/api/projects/${project.id}?view=workspace`,route=>route.fulfill({json:{project:snapshot}}))
 await page.route('**/api/ai/options*',route=>route.fulfill({json:{keyConfigured:true,models:[quote]}}))
 let commands=0
 await page.route(`**/api/projects/${project.id}/commands`,route=>{commands++;return route.fulfill({status:409,json:{error:'Không gửi AI trong kiểm thử'}})})
 await page.goto('/#he-thong-1')
 const budget=page.getByTestId('ai-budget'),settings=page.getByTestId('openrouter-settings')
 await expect(budget).toContainText('thiếu 0.620000 USD')
 await expect(budget).toContainText('Bạn tự đối chiếu: 1.000000 USD')
 await settings.locator('summary').click()
 await settings.getByLabel('Ngân sách dự toán (USD)',{exact:true}).fill('5')
 await expect(settings).toContainText('Chưa lưu thay đổi')
 await expect(page.getByRole('button',{name:'Tiếp tục từ checkpoint'})).toBeDisabled()
 await expect(budget).toContainText('thiếu 0.620000 USD')
 await settings.getByRole('button',{name:'Dùng lại cấu hình đã lưu'}).click()
 await expect(settings.getByLabel('Ngân sách dự toán (USD)',{exact:true})).toHaveValue('1')
 await expect(page.getByRole('button',{name:'Tiếp tục từ checkpoint'})).toBeEnabled()
 expect(commands).toBe(0)
 await budget.screenshot({path:'.local/e2e-results/priority1-budget-desktop.png'})
 await page.setViewportSize({width:390,height:844})
 await expect(budget).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await budget.screenshot({path:'.local/e2e-results/priority1-budget-mobile.png'})
})
