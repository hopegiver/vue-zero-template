// @ts-check
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:8004'

// 컴포넌트 지연 로딩 회귀 테스트
// - 앱 시작 시 components.json 전체를 fetch하지 않는다
// - 페이지가 쓰는 컴포넌트만 해당 페이지 로드 중에 받는다

function trackComponentRequests(page) {
  const requested = []
  page.on('request', req => {
    const m = req.url().match(/\/components\/([^/?]+\.vue)(\?|$)/)
    if (m) requested.push(m[1])
  })
  return requested
}

test('컴포넌트를 쓰지 않는 페이지 — 컴포넌트 요청 0건', async ({ page }) => {
  const requested = trackComponentRequests(page)
  await page.goto(BASE + '/about', { waitUntil: 'networkidle' })
  await expect(page.locator('body')).toContainText('vue-zero — 제로빌드 Vue 3 라우터')
  expect(requested).toEqual([])
})

test('컴포넌트를 쓰는 페이지 — 필요한 컴포넌트만 1회 요청, 렌더링됨', async ({ page }) => {
  const requested = trackComponentRequests(page)
  await page.goto(BASE + '/todo', { waitUntil: 'networkidle' })
  await expect(page.getByRole('button', { name: '추가' })).toBeVisible()
  expect(requested).toEqual(['AppButton.vue'])
})

test('SPA 이동 시점에 컴포넌트를 받는다 (이동 전에는 요청 없음)', async ({ page }) => {
  const requested = trackComponentRequests(page)
  await page.goto(BASE + '/about', { waitUntil: 'networkidle' })
  expect(requested).toEqual([])

  // about → Home(AppButton 사용 페이지)
  await page.click('a[href="/"]')
  await expect(page.locator('body')).toContainText('vue-zero 예제 앱입니다.', { timeout: 5000 })
  expect(requested).toEqual(['AppButton.vue'])
})

test('이미 받은 컴포넌트는 SPA 이동에서 재요청하지 않는다 (캐시)', async ({ page }) => {
  const requested = trackComponentRequests(page)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  expect(requested).toEqual(['AppButton.vue'])

  // Home → Todo (둘 다 AppButton 사용)
  await page.click('a[href="/todo"]')
  await expect(page.getByRole('button', { name: '추가' })).toBeVisible({ timeout: 5000 })
  expect(requested).toEqual(['AppButton.vue'])
})

test('컴포넌트 로드 실패 — 페이지 이동은 막지 않고 에러를 로그한다', async ({ page }) => {
  const consoleErrors = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
  await page.route('**/components/AppButton.vue', route => route.fulfill({ status: 500, body: 'boom' }))

  await page.goto(BASE + '/todo', { waitUntil: 'networkidle' })
  await expect(page.locator('body')).toContainText('할일 관리')
  expect(consoleErrors.some(e => e.includes('AppButton'))).toBe(true)
})
