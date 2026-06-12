// @ts-check
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:8787'
const LOGIN_EMAIL = 'admin@example.com'
const LOGIN_PASSWORD = 'password'

// 로그인 헬퍼
async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', LOGIN_EMAIL)
  await page.fill('input[type="password"]', LOGIN_PASSWORD)
  await page.click('.btn-primary')
  await page.waitForURL(BASE + '/', { timeout: 5000 })
}

// 로그아웃 헬퍼 — 페이지가 열린 상태에서만 동작
async function logout(page) {
  await page.goto('http://localhost:8787/login', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.removeItem('token'))
}

// ── 미인증 상태 ────────────────────────────────────────

test('미인증 — 보호 페이지 접근 시 /login 리다이렉트', async ({ page }) => {
  await logout(page)
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
})

test('미인증 — admin 페이지 접근 시 /login 리다이렉트', async ({ page }) => {
  await logout(page)
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
})

test('미인증 — /login 페이지는 그대로 접근 가능 (auth: false)', async ({ page }) => {
  await logout(page)
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(BASE + '/login')
  await expect(page.locator('body')).toContainText('로그인')
})

test('미인증 — 404 페이지는 그대로 접근 가능 (auth: false)', async ({ page }) => {
  await logout(page)
  await page.goto(BASE + '/nonexistent', { waitUntil: 'networkidle' })
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.locator('body')).toContainText('페이지를 찾을 수 없습니다')
})

// ── 로그인 ────────────────────────────────────────────

test('로그인 성공 — 토큰 저장 후 / 리다이렉트', async ({ page }) => {
  await logout(page)
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', LOGIN_EMAIL)
  await page.fill('input[type="password"]', LOGIN_PASSWORD)
  await page.click('.btn-primary')

  await expect(page).toHaveURL(BASE + '/', { timeout: 5000 })

  const token = await page.evaluate(() => localStorage.getItem('token'))
  expect(token).toBeTruthy()
  expect(token.split('.').length).toBe(3)  // JWT 형식 확인
})

test('로그인 실패 — 잘못된 자격증명 에러 표시', async ({ page }) => {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', 'wrong@example.com')
  await page.fill('input[type="password"]', 'wrongpassword')
  await page.click('.btn-primary')

  await expect(page.locator('.text-danger')).toBeVisible({ timeout: 3000 })
  await expect(page).toHaveURL(BASE + '/login')
})

// ── 인증 상태 ──────────────────────────────────────────

test('인증 후 — 보호 페이지 정상 접근', async ({ page }) => {
  await login(page)
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(BASE + '/dashboard')
  await expect(page.locator('body')).toContainText('대시보드')
})

test('인증 후 — admin 페이지 정상 접근', async ({ page }) => {
  await login(page)
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(BASE + '/admin')
  await expect(page.locator('body')).toContainText('관리자')
})

test('인증 후 — 여러 보호 페이지 연속 이동', async ({ page }) => {
  await login(page)

  for (const path of ['/dashboard', '/admin', '/admin/members', '/counter', '/todo']) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await expect(page).not.toHaveURL(/\/login/, { timeout: 3000 })
  }
})

// ── 로그아웃 후 ───────────────────────────────────────

test('로그아웃 후 — 보호 페이지 다시 차단', async ({ page }) => {
  await login(page)

  // 대시보드 접근 가능 확인
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(BASE + '/dashboard')

  // 로그아웃
  await logout(page)

  // 대시보드 다시 접근 → 차단
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
})

// ── JWT 만료 ───────────────────────────────────────────

test('만료된 토큰 — 보호 페이지 접근 시 /login 리다이렉트', async ({ page }) => {
  // 이미 만료된 JWT 수동 세팅 (exp: 과거 시간)
  const expiredToken = [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ sub: 1, email: LOGIN_EMAIL, exp: 1000000, iat: 999999 })),
    'invalidsignature'
  ].join('.')

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate((token) => localStorage.setItem('token', token), expiredToken)

  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

  // 만료 토큰은 localStorage에서 자동 제거되어야 함
  const remaining = await page.evaluate(() => localStorage.getItem('token'))
  expect(remaining).toBeNull()
})
