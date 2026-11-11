// @ts-check
import { test, expect } from '@playwright/test'

// 템플릿이 manifest 옵션을 켠 상태의 부팅 요청 패턴: vz-manifest.json 1건, pages.json/components.json/404·error 확인 없음
test('부팅 시 vz-manifest.json 1건만 받고 pages.json/components.json 은 요청하지 않는다', async ({ page }) => {
  const urls = []
  page.on('request', (r) => { if (!r.redirectedFrom()) urls.push(new URL(r.url()).pathname) })
  await page.goto('/about')
  await expect(page.locator('#app')).toContainText('vue-zero')
  expect(urls.filter((u) => u === '/vz-manifest.json')).toHaveLength(1)
  expect(urls.filter((u) => /\/(pages|components)\.json$/.test(u))).toEqual([])
  expect(urls.filter((u) => /\/(404|error)\.vue$/.test(u))).toEqual([])
})

test('매니페스트가 404 면 pages.json 으로 폴백해 앱은 그대로 동작한다', async ({ page }) => {
  await page.route('**/vz-manifest.json', (route) => route.fulfill({ status: 404, body: 'not found' }))
  const urls = []
  page.on('request', (r) => urls.push(new URL(r.url()).pathname))
  await page.goto('/about')
  await expect(page.locator('#app')).toContainText('vue-zero')
  expect(urls.some((u) => u.endsWith('/pages.json'))).toBe(true)
})
