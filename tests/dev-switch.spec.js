// @ts-check
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:8004'
const vueSrcs = () => Array.from(document.scripts).map(s => s.src).filter(Boolean)

test('localhost에서는 dev 빌드를 vue-zero.js보다 먼저 로드한다', async ({ page }) => {
  await page.goto(BASE + '/about')
  const srcs = await page.evaluate(vueSrcs)
  const i = (re) => srcs.findIndex(s => re.test(s))
  expect(i(/vue\.global\.js$/)).toBeGreaterThanOrEqual(0)
  expect(i(/vue-router\.global\.js$/)).toBeGreaterThanOrEqual(0)
  expect(srcs.some(s => /\.prod\.js$/.test(s))).toBe(false)
  expect(i(/vue\.global\.js$/)).toBeLessThan(i(/vue-router\.global\.js$/))
  expect(i(/vue-router\.global\.js$/)).toBeLessThan(i(/vue-zero\.js$/))
  await expect(page.locator('#app')).toContainText('vue-zero')
})

test('호스트별 선택 로직: 운영 도메인은 prod, ?vzdev는 dev', async ({ page }) => {
  await page.goto(BASE + '/about')
  const run = (hostname, search) => page.evaluate(([h, q]) => {
    const code = Array.from(document.scripts).find(s => s.textContent.includes('document.write')).textContent
    const written = []
    new Function('location', 'document', code)({ hostname: h, search: q }, { write: (x) => written.push(x) })
    return written
  }, [hostname, search])
  const prod = await run('example.com', '')
  expect(prod.every(w => w.includes('.prod.js'))).toBe(true)
  expect(prod).toHaveLength(2)
  const dev = await run('example.com', '?vzdev')
  expect(dev.some(w => w.includes('.prod.js'))).toBe(false)
})
