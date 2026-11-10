// @ts-check
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:8004'

// 모든 페이지가 에러 없이 로드되는지 확인
const pages = [
  { path: '/', title: 'vue-zero Home', has: 'vue-zero 예제 앱입니다.' },
  { path: '/about', title: null, has: 'vue-zero — 제로빌드 Vue 3 라우터' },
  { path: '/contact', title: '문의하기', has: '문의하기' },
  { path: '/counter', title: '카운터', has: '카운터' },
  { path: '/dashboard', title: '대시보드', has: '대시보드' },
  { path: '/datatable', title: '데이터 테이블', has: '데이터 테이블' },
  { path: '/gallery', title: '갤러리', has: '이미지 갤러리' },
  { path: '/login', title: '로그인', has: '로그인' },
  { path: '/minimal', title: null, has: '미니멀 페이지' },
  { path: '/search', title: '검색', has: '검색' },
  { path: '/search?q=vue', title: '검색', has: 'vue' },
  { path: '/settings', title: '설정', has: '설정' },
  { path: '/tabs', title: '탭 컴포넌트', has: '프로필' },
  { path: '/tabs?tab=security', title: '탭 컴포넌트', has: '보안' },
  { path: '/timer', title: '타이머', has: '타이머' },
  { path: '/todo', title: '할일 관리', has: '할일 관리' },
  { path: '/users', title: null, has: 'Users' },
  { path: '/users/1', title: '유저 상세', has: '다른 유저' },
  { path: '/users/1/posts', title: '유저 게시글', has: '게시글' },
  { path: '/admin', title: '관리자 대시보드', has: '안녕하세요, 관리자님' },
  { path: '/admin/members', title: 'Moby Read 리포트', has: 'Moby Read 리포트' },
]

for (const p of pages) {
  test(`페이지 로드: ${p.path}`, async ({ page }) => {
    const errors = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(BASE + p.path, { waitUntil: 'networkidle' })
    await expect(page.locator('body')).toContainText(p.has, { timeout: 5000 })

    if (p.title) {
      await expect(page).toHaveTitle(p.title, { timeout: 3000 })
    }

    expect(errors).toEqual([])
  })
}

// 404 페이지
test('404 페이지', async ({ page }) => {
  await page.goto(BASE + '/nonexistent', { waitUntil: 'networkidle' })
  await expect(page.locator('body')).toContainText('페이지를 찾을 수 없습니다', { timeout: 5000 })
})

// error.vue — 페이지 컴포넌트 fetch 실패 시 에러 화면 표시 (beforeEach catch 트리거)
test('error.vue — 페이지 로드 실패 시 에러 화면 표시, URL 미변경, 홈 복귀', async ({ page }) => {
  await page.goto(BASE + '/about', { waitUntil: 'networkidle' })

  // /users 페이지의 .vue fetch를 가로채 500을 반환시켜 beforeEach의 catch 블록을 강제로 트리거
  await page.route('**/pages/users/index.vue', route => route.fulfill({ status: 500, body: 'boom' }))

  await page.click('a[href="/users"]')
  await expect(page.locator('body')).toContainText('오류', { timeout: 5000 })
  await expect(page.locator('body')).toContainText('문제가 발생했습니다', { timeout: 5000 })

  // 라우팅 자체가 취소되어 URL은 그대로 유지되어야 함
  expect(page.url()).toBe(BASE + '/about')

  // "홈으로 돌아가기" 링크로 정상 복귀
  await page.click('text=홈으로 돌아가기')
  await expect(page.locator('body')).toContainText('vue-zero 예제 앱입니다.', { timeout: 5000 })
  expect(page.url()).toBe(BASE + '/')
})

// 레이아웃 전환: default → admin → default
test('레이아웃 전환 (default → admin → default)', async ({ page }) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  // default 레이아웃 = 상단 navbar, admin 레이아웃 = .admin-wrap
  await expect(page.locator('nav.navbar')).toBeVisible()

  await page.click('a[href="/admin"]')
  await expect(page.locator('.admin-wrap')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('nav.navbar')).not.toBeVisible()

  // admin 레이아웃에는 홈 링크가 없으므로 뒤로 가기로 default 레이아웃 복귀를 확인
  await page.goBack()
  await expect(page.locator('nav.navbar')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.admin-wrap')).not.toBeVisible()
})

// layout: false (로그인 페이지에 레이아웃 없음)
test('layout: false — 로그인 페이지에 레이아웃 없음', async ({ page }) => {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await expect(page.locator('nav.navbar')).not.toBeVisible()
  await expect(page.locator('.admin-wrap')).not.toBeVisible()
  await expect(page.locator('input[type="email"]')).toBeVisible()
})

// 같은 레이아웃 내 페이지 이동 (admin 레이아웃 유지)
test('같은 레이아웃 내 이동 (admin 유지)', async ({ page }) => {
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' })
  await expect(page.locator('.admin-sidebar')).toBeVisible()

  await page.click('a[href="/admin/members"]')
  await expect(page.locator('.admin-sidebar')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Moby Read 리포트' })).toBeVisible({ timeout: 5000 })
})

// 동적 라우트 파라미터 변경 (같은 컴포넌트 재사용)
test('동적 라우트 파라미터 변경 (/users/1 → /users/2)', async ({ page }) => {
  await page.goto(BASE + '/users/1', { waitUntil: 'networkidle' })
  await expect(page.getByText('다른 유저')).toBeVisible({ timeout: 5000 })

  await page.click('a[href="/users/2"]')
  await page.waitForTimeout(500)
  // URL이 변경되었는지 확인
  expect(page.url()).toContain('/users/2')
})

// 히스토리 모드 새로고침
test('히스토리 모드 — 서브페이지 새로고침', async ({ page }) => {
  const errors = []
  page.on('pageerror', err => errors.push(err.message))

  await page.goto(BASE + '/users/1', { waitUntil: 'networkidle' })
  await expect(page.getByText('다른 유저')).toBeVisible({ timeout: 5000 })

  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByText('다른 유저')).toBeVisible({ timeout: 5000 })

  expect(errors).toEqual([])
})

// counter computed + watch
test('counter — computed, watch 동작', async ({ page }) => {
  await page.goto(BASE + '/counter', { waitUntil: 'networkidle' })
  const count = page.locator('.display-4')
  const plus = page.getByRole('button', { name: '+1', exact: true })

  await plus.click()
  await expect(count).toHaveText('1')
  await expect(page.getByText('x2 = 2')).toBeVisible()
  await expect(page.getByText('변경 횟수: 1')).toBeVisible()

  await plus.click()
  await expect(count).toHaveText('2')
  await expect(page.getByText('변경 횟수: 2')).toBeVisible()

  await page.getByRole('button', { name: '초기화' }).click()
  await expect(count).toHaveText('0')
})

// search 쿼리스트링
test('search — 쿼리스트링 동기화', async ({ page }) => {
  await page.goto(BASE + '/search?q=vue', { waitUntil: 'networkidle' })
  await expect(page.locator('input.form-control')).toHaveValue('vue')
  await expect(page.locator('li', { hasText: 'vue-zero' })).toBeVisible()
})

// todo CRUD
test('todo — 추가, 완료, 삭제', async ({ page }) => {
  await page.goto(BASE + '/todo', { waitUntil: 'networkidle' })
  const items = page.locator('ul.list-unstyled li')

  // 추가
  await page.fill('input[placeholder="할일 입력..."]', '테스트 할일')
  await page.getByRole('button', { name: '추가' }).click()
  await expect(items).toContainText('테스트 할일')

  // 완료
  await items.locator('input[type="checkbox"]').click()
  await expect(items.locator('.text-decoration-line-through')).toBeVisible()

  // 완료 항목 삭제
  await page.getByRole('button', { name: '완료 항목 삭제' }).click()
  await expect(items).toHaveCount(0)
})

// gallery 모달
test('gallery — 모달 열기/닫기', async ({ page }) => {
  await page.goto(BASE + '/gallery', { waitUntil: 'networkidle' })
  const item = page.locator('.container [role="button"]').first()
  await expect(item).toBeVisible({ timeout: 5000 })

  await item.click()
  await expect(page.locator('.modal-overlay')).toBeVisible()

  await page.getByRole('button', { name: '닫기' }).click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
})

// 콘솔 에러 없이 전체 네비게이션
test('전체 네비게이션 — 콘솔 에러 없음', { timeout: 60000 }, async ({ page }) => {
  const errors = []
  page.on('pageerror', err => errors.push(err.message))

  const links = ['/about', '/contact', '/counter', '/search', '/settings',
                 '/minimal', '/todo', '/datatable', '/gallery', '/timer',
                 '/tabs', '/dashboard', '/users', '/admin', '/login', '/']

  for (const link of links) {
    await page.goto(BASE + link, { waitUntil: 'domcontentloaded', timeout: 10000 })
    await page.waitForTimeout(500)
  }

  expect(errors).toEqual([])
})
