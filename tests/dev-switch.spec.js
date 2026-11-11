// @ts-check
import { test, expect } from '@playwright/test'

// dev(localhost, ?vzdev) / prod(그 외 호스트) 빌드 선택 + 실행 순서 + document.write 미사용 검증.
// prod 호스트는 Chromium 의 host-resolver-rules 로 prod.example.test → 127.0.0.1 에 매핑해 흉내 낸다.
test.use({ launchOptions: { args: ['--host-resolver-rules=MAP prod.example.test 127.0.0.1'] } })

const LOCAL = 'http://localhost:8004'
const PROD = 'http://prod.example.test:8004'

// 전역(Vue/VueRouter/VueZero) 대입 순서와 document.write 호출 수, 앱 부트스트랩 시점을 기록한다
async function instrument(page) {
  await page.addInitScript(() => {
    const w = /** @type {any} */ (window)
    w.__order = []
    w.__writes = 0
    const dw = document.write.bind(document)
    document.write = (...a) => { w.__writes++; return dw(...a) }
    for (const k of ['Vue', 'VueRouter', 'VueZero']) {
      let v
      Object.defineProperty(window, k, { configurable: true, get: () => v, set: (x) => { if (v === undefined) w.__order.push(k); v = x } })
    }
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver((_, ob) => { if (document.querySelector('#app')?.children.length) { w.__order.push('mounted'); ob.disconnect() } })
        .observe(document.documentElement, { childList: true, subtree: true })
    })
  })
}

async function visit(page, url) {
  const reqs = []
  page.on('request', (r) => { if (!r.redirectedFrom() && /\/(vue|vue-router)\.global(\.prod)?\.js$/.test(r.url())) reqs.push(r.url()) })
  await instrument(page)
  await page.goto(url)
  await expect(page.locator('#app')).toContainText('vue-zero')
  const info = await page.evaluate(() => ({ order: /** @type {any} */ (window).__order, writes: /** @type {any} */ (window).__writes }))
  return { ...info, reqs }
}

const EXPECT_ORDER = ['Vue', 'VueRouter', 'VueZero', 'mounted']

test('localhost: dev 빌드, vue → vue-router → vue-zero → 앱 시작 순서', async ({ page }) => {
  const r = await visit(page, LOCAL + '/about')
  expect(r.order).toEqual(EXPECT_ORDER)
  expect(r.reqs).toHaveLength(2)
  expect(r.reqs.some(u => u.endsWith('.prod.js'))).toBe(false)
  expect(r.writes).toBe(0)
})

test('운영 호스트: prod 빌드, document.write 미사용, 같은 실행 순서', async ({ page }) => {
  const r = await visit(page, PROD + '/about')
  expect(r.order).toEqual(EXPECT_ORDER)
  expect(r.reqs).toHaveLength(2)
  expect(r.reqs.every(u => u.endsWith('.prod.js'))).toBe(true)
  expect(r.writes).toBe(0)
})

test('운영 호스트 + ?vzdev: dev 빌드, 같은 실행 순서', async ({ page }) => {
  const r = await visit(page, PROD + '/about?vzdev')
  expect(r.order).toEqual(EXPECT_ORDER)
  expect(r.reqs.some(u => u.endsWith('.prod.js'))).toBe(false)
  expect(r.writes).toBe(0)
})
