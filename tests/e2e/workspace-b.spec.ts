import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { icaPreset } from '../../src/lib/projects/ica-preset'

test('light workspace keeps navigation and workflow usable on desktop and mobile', async ({ page, request }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const created = await request.post('/api/projects', {
    headers: { origin: 'http://127.0.0.1:3201' },
    data: { name: 'Workspace B · Mẫu kiểm tra', brief: icaPreset, requestId: randomUUID() },
  })
  expect(created.ok()).toBe(true)
  const { project } = await created.json()
  const started = await request.post(`/api/projects/${project.id}/commands`, {
    headers: { origin: 'http://127.0.0.1:3201' },
    data: { type: 'start', requestId: randomUUID() },
  })
  expect(started.ok()).toBe(true)
  await page.addInitScript(id => localStorage.setItem('mission-control.active-project.v1', id), project.id)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/#he-thong-1')
  const controls = page.getByRole('group', { name: 'Điều khiển quy trình' })
  await expect(controls.getByRole('button', { name: 'Duyệt 1 và tiếp tục', exact: true })).toBeEnabled()
  await expect(page.locator('.artifact-document')).toHaveAttribute('open', '')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light')
  const nav = await page.getByRole('navigation', { name: 'Hệ thống', exact: true }).boundingBox()
  const main = await page.locator('#workspace-main').boundingBox()
  expect(nav!.x + nav!.width).toBeLessThan(main!.x)
  await page.getByRole('navigation', { name: 'Nội dung dự án' }).getByRole('button', { name: 'Kết quả & quy trình' }).click()
  const controlBox = await controls.boundingBox()
  const documentBox = await page.locator('.workflow-content').boundingBox()
  expect(controlBox!.x).toBeGreaterThan(documentBox!.x + documentBox!.width)
  await page.screenshot({ path: '.local/e2e-results/workspace-b-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const mobileControl = await controls.boundingBox()
  const mobileDocument = await page.locator('.workflow-content').boundingBox()
  expect(mobileDocument!.y).toBeGreaterThan(mobileControl!.y)
  await page.getByRole('navigation', { name: 'Hệ thống', exact: true }).getByRole('button', { name: 'Quản trị', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Hệ thống', exact: true }).getByRole('button', { name: 'Quản trị', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('navigation', { name: 'Hệ thống', exact: true }).getByRole('button', { name: 'Sản phẩm Win', exact: true }).click()
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: '.local/e2e-results/workspace-b-mobile.png' })
  await page.locator('.skip-link').focus()
  await page.locator('.skip-link').press('Enter')
  await expect(page.locator('#workspace-main')).toBeFocused()
  expect(page.url()).toContain('#he-thong-1')
  expect(errors).toEqual([])
})

test('legacy simulation retains readable result and recommendation text in light mode', async ({ page }) => {
  await page.goto('/#he-thong-1')
  const simulation = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Xem bản mô phỏng giao diện cũ' }) })
  await simulation.locator(':scope > summary').click()
  await simulation.getByRole('button', { name: 'Giao việc cho đội AI', exact: true }).click()
  await simulation.getByRole('group', { name: 'Tốc độ' }).getByRole('button', { name: '×4', exact: true }).click()
  const output = simulation.getByRole('button').filter({ hasText: 'SẴN SÀNG' }).first()
  async function contrast(locator: typeof output) {
    return locator.evaluate(element => {
      const style = getComputedStyle(element)
      const luminance = (color: string) => {
        const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
          const s = value / 255
          return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4
        })
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
      }
      // Resolve translucent backgrounds against the white card below the output.
      const foreground = luminance(style.color)
      const channels = style.backgroundColor.match(/[\d.]+/g)!.map(Number)
      const alpha = channels[3] ?? 1
      const background = luminance(`rgb(${channels.slice(0, 3).map(value => value * alpha + 255 * (1 - alpha)).join(',')})`)
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05)
    })
  }
  const recommendation = page.getByText('ĐỀ XUẤT', { exact: true })
  await expect(recommendation).toBeVisible({ timeout: 10000 })
  const recommendationContrast = await contrast(recommendation)
  await page.getByRole('dialog').getByRole('button').last().click()
  await expect(output).toBeVisible({ timeout: 10000 })
  const outputContrast = await contrast(output)
  expect.soft(recommendationContrast).toBeGreaterThanOrEqual(4.5)
  expect.soft(outputContrast).toBeGreaterThanOrEqual(4.5)
})
