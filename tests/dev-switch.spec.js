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

// ── 로더 위치: head 최상단(CSS 링크 앞)에서 즉시 스크립트 삽입 시작 ───────────────────────────
// 스타일시트 뒤의 인라인 스크립트는 그 스타일시트가 도착할 때까지 실행이 막힌다.
// CSS 응답을 지연시켜, 그 사이에 vue 스크립트 요청이 이미 나갔는지 본다.
test('로더는 CSS 보다 먼저 스크립트 요청을 시작한다 (CSS 지연 중에 vue/vue-router/vue-zero 요청이 나간다)', async ({ page }) => {
  const t0 = Date.now()
  const seen = {}
  let cssDone = 0
  page.on('request', (r) => {
    const m = /\/(vue\.global|vue-router\.global|vue-zero)(\.prod)?\.js$/.exec(r.url())
    if (m && !(m[1] in seen)) seen[m[1]] = Date.now() - t0
  })
  await page.route('**/bootstrap.min.css', async (route) => {
    await new Promise((res) => setTimeout(res, 1500))
    cssDone = Date.now() - t0
    await route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  })
  await page.goto(LOCAL + '/about', { waitUntil: 'commit' })
  await expect(page.locator('#app')).toContainText('vue-zero', { timeout: 15000 })
  expect(cssDone).toBeGreaterThan(0)
  for (const k of ['vue.global', 'vue-router.global', 'vue-zero']) {
    expect(seen[k], `${k} 요청 시각`).toBeDefined()
    expect(seen[k], `${k} 가 CSS 완료(${cssDone}ms)보다 먼저 요청됐는가`).toBeLessThan(cssDone)
  }
  // 소스 순서도 고정: 로더 <script> 가 첫 stylesheet <link> 보다 앞
  const order = await page.evaluate(() => [...document.head.children].map((e) => e.tagName + (e.getAttribute('rel') || '')))
  expect(order.indexOf('SCRIPT')).toBeLessThan(order.indexOf('LINKstylesheet'))
})

test('vzLoad(boot): 완료 전 등록은 로딩 끝난 뒤 한 번, 완료 후 등록은 즉시 실행', async ({ page }) => {
  // 완료 전: utils.js 응답을 지연시켜 body 의 vzLoad 호출 시점에는 아직 로딩 중이게 한다
  await page.route('**/assets/js/utils.js', async (route) => {
    await new Promise((res) => setTimeout(res, 800))
    await route.continue()
  })
  await page.addInitScript(() => {
    const w = /** @type {any} */ (window)
    w.__boots = []
    let f
    Object.defineProperty(window, 'vzLoad', {
      configurable: true,
      get: () => f,
      set: (fn) => { f = (cb) => { w.__boots.push({ registered: typeof w.useApi, ranSync: false }); const rec = w.__boots[w.__boots.length - 1]; let inCall = true; fn(() => { rec.ranSync = inCall; rec.ranWhen = typeof w.useApi; cb() }); inCall = false } },
    })
  })
  await page.goto(LOCAL + '/about')
  await expect(page.locator('#app')).toContainText('vue-zero')
  const first = await page.evaluate(() => /** @type {any} */ (window).__boots)
  expect(first).toHaveLength(1)
  expect(first[0].registered).toBe('undefined') // 등록 시점엔 utils.js 미실행
  expect(first[0].ranSync).toBe(false) //          콜백은 완료 후에 호출
  expect(first[0].ranWhen).toBe('function') //     호출 시점엔 utils.js 실행 완료
  // 완료 후: 이미 모두 로드된 뒤 등록하면 같은 호출 안에서 즉시 실행
  const after = await page.evaluate(() => { let ran = false; /** @type {any} */ (window).vzLoad(() => { ran = true }); return ran })
  expect(after).toBe(true)
})
