import { test, expect, type Page } from '@playwright/test'
async function openBrief(page:Page) {
  await page.goto('/#he-thong-1')
  // The hash is read after mount; using the main CTA also supports existing slug names.
  const cta=page.getByRole('button',{name:'Mở Sản phẩm Win'})
  if(await cta.isVisible()) await cta.click()
  await expect(page.getByRole('heading',{name:'Một đề bài cho cả 5 hệ thống'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Điền mẫu ICA'})).toBeEnabled()
}
async function save(page:Page) {
  await page.getByRole('button',{name:'Lưu đề bài',exact:true}).click()
  await expect(page.getByRole('status')).toContainText('Đã lưu đề bài trên máy')
}

test('ICA persists across reload, all five tabs, and mobile layout',async({page})=>{
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message))
  await openBrief(page)
  await page.getByRole('button',{name:'Điền mẫu ICA'}).click()
  await expect(page.getByLabel('Ngách *',{exact:true})).toHaveValue('Chữ ký số dịch vụ công Kho bạc Nhà nước')
  await save(page)
  await page.reload()
  await expect(page.getByLabel('Sản phẩm / dịch vụ *',{exact:true})).toHaveValue('Chữ ký số')
  const summary=page.getByRole('complementary')
  await expect(summary).toContainText('1.792.800 ₫')
  await expect(summary).toContainText('2.690.000 ₫')
  await expect(summary).toContainText('3.080.000 ₫')
  await expect(summary).toContainText('Tặng thêm 6 tháng')
  await page.getByLabel('Bán cho ai? *',{exact:true}).fill('Kế toán Đà Nẵng — bản chưa lưu')
  for(const name of ['Kênh Video AI','Chuyển đổi','Giao hàng & CSKH','Quản trị']) {
    await page.getByRole('navigation',{name:'Hệ thống'}).getByRole('button',{name,exact:true}).click()
    const shared=page.getByRole('region',{name:'Đề bài chung của dự án'})
    await expect(shared).toContainText('Kế toán ở Đà Nẵng')
    await expect(shared).toContainText('3.080.000 ₫')
    await expect(shared).toContainText('Có thay đổi chưa lưu')
  }
  await page.getByRole('button',{name:'Chỉnh sửa tại Sản phẩm Win'}).click()
  await expect(page.getByLabel('Bán cho ai? *',{exact:true})).toHaveValue('Kế toán Đà Nẵng — bản chưa lưu')
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  await page.screenshot({path:'.local/e2e-results/milestone-a-mobile.png',fullPage:true})
  await page.setViewportSize({width:1440,height:1000})
  await page.screenshot({path:'.local/e2e-results/milestone-a-desktop.png',fullPage:true})
  expect(errors).toEqual([])
})

test('validation links keep the editor open and malformed price is rejected',async({page})=>{
  await page.route('**/api/projects',route=>route.request().method()==='GET'?route.fulfill({json:{projects:[]}}):route.continue())
  await openBrief(page)
  await page.getByRole('button',{name:'Điền mẫu ICA'}).click()
  await page.getByLabel('Ngách *',{exact:true}).fill('')
  await page.getByRole('button',{name:'Lưu đề bài',exact:true}).click()
  await expect(page.getByRole('region',{name:'Sản phẩm Win',exact:true}).getByRole('alert')).toContainText('Cần kiểm tra')
  const before=page.url()
  await page.getByRole('region',{name:'Sản phẩm Win',exact:true}).getByRole('alert').getByRole('link').first().click()
  expect(page.url()).toBe(before)
  await expect(page.getByLabel('Ngách *',{exact:true})).toBeFocused()
  await page.getByLabel('Ngách *',{exact:true}).fill('Chữ ký số')
  await page.getByLabel('Giá bán (VND) *',{exact:true}).first().fill('123.5')
  await page.getByRole('button',{name:'Lưu đề bài',exact:true}).click()
  await expect(page.getByRole('region',{name:'Sản phẩm Win',exact:true}).getByRole('alert')).toContainText('số nguyên VND')
})

test('failed first save retains editable input and can retry',async({page})=>{
  let first=true
  await page.route('**/api/projects',route=>{
    if(route.request().method()==='GET') return route.fulfill({json:{projects:[]}})
    if(first) {first=false;return route.abort('failed')}
    return route.continue()
  })
  await openBrief(page)
  await page.getByRole('button',{name:'Điền mẫu ICA'}).click()
  await page.getByRole('button',{name:'Lưu đề bài',exact:true}).click()
  await expect(page.getByRole('region',{name:'Sản phẩm Win',exact:true}).getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Sản phẩm / dịch vụ *',{exact:true})).toBeEnabled()
  await expect(page.getByLabel('Sản phẩm / dịch vụ *',{exact:true})).toHaveValue('Chữ ký số')
  await save(page)
})

test('two windows detect stale saves and retain the owners draft for comparison',async({page,context})=>{
  await openBrief(page)
  await page.getByRole('button',{name:'Điền mẫu ICA'}).click()
  await save(page)
  const other=await context.newPage();await openBrief(other)
  await page.getByLabel('Sản phẩm / dịch vụ *',{exact:true}).fill('Chữ ký số — cửa sổ A')
  await page.getByText('Thông tin bổ sung',{exact:false}).click()
  await page.getByLabel('Thương hiệu của bạn',{exact:true}).fill('ICA Đà Nẵng — đã xác nhận')
  await page.getByLabel('Ưu đãi và điều kiện khác',{exact:true}).fill('Chưa cam kết thời gian kích hoạt')
  await page.getByLabel('Tài liệu / nguồn tham khảo',{exact:true}).fill('Tài liệu người bán cung cấp')
  await save(page)
  await other.getByLabel('Sản phẩm / dịch vụ *',{exact:true}).fill('Chữ ký số — cửa sổ B')
  await other.getByRole('button',{name:'Lưu đề bài',exact:true}).click()
  await expect(other.getByRole('region',{name:'Sản phẩm Win',exact:true}).getByRole('alert')).toContainText('cửa sổ khác')
  await expect(other.getByLabel('Sản phẩm / dịch vụ *',{exact:true})).toHaveValue('Chữ ký số — cửa sổ B')
  await expect(other.getByRole('heading',{name:/Bản đang có trên máy/})).toBeVisible()
  await expect(other.getByTestId('conflict-comparison')).toContainText('ICA Đà Nẵng — đã xác nhận')
  await expect(other.getByTestId('conflict-comparison')).toContainText('Chưa cam kết thời gian kích hoạt')
  await expect(other.getByTestId('conflict-comparison')).toContainText('Tài liệu người bán cung cấp')
  await other.getByRole('button',{name:'Giữ nội dung của tôi để sửa tiếp'}).click()
  await save(other)
  await other.reload()
  await expect(other.getByLabel('Sản phẩm / dịch vụ *',{exact:true})).toHaveValue('Chữ ký số — cửa sổ B')
})
test('retry after persisted create with lost response keeps a single project',async({page,request})=>{
  const before=await (await request.get('/api/projects')).json()
  let first=true
  await page.route('**/api/projects',async route=>{
    if(route.request().method()==='GET') return route.fulfill({json:{projects:[]}})
    if(first) {first=false;await route.fetch();return route.abort('failed')}
    return route.continue()
  })
  await openBrief(page)
  await page.getByRole('button',{name:'Điền mẫu ICA'}).click()
  await page.getByRole('button',{name:'Lưu đề bài',exact:true}).click()
  await expect(page.getByRole('region',{name:'Sản phẩm Win',exact:true}).getByRole('alert')).toBeVisible()
  await save(page)
  const after=await (await request.get('/api/projects')).json()
  expect(after.projects.length-before.projects.length).toBe(1)
})