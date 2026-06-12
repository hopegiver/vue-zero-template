# vue-zero-template - AI 개발 가이드

> vue-zero 프레임워크의 공식 템플릿 프로젝트. 풀스택 데모 앱과 개발 환경을 포함.

## 프로젝트 개요

vue-zero 기반 앱의 레퍼런스 템플릿. 페이지, 컴포넌트, 레이아웃, API 엔드포인트의 실제 사용 예시를 포함하며, 새 프로젝트의 시작점으로 사용.

## 기술 스택

- 프론트엔드: vue-zero (Vue 3 Options API, 제로빌드)
- 백엔드: Hono + Cloudflare Workers
- 배포: Cloudflare (`wrangler deploy`)

## 폴더 구조

```
vue-zero-template/
├── wrangler.toml
├── server/                   # 백엔드 (Nuxt 동일 구조)
│   ├── index.js              # 안정 파일 — 수정 불필요
│   ├── _registry.js          # scan 자동 생성 — 편집 금지
│   ├── middleware/auth.js     # JWT 미들웨어 + signJwt
│   ├── api/                  # 엔드포인트 — 파일 추가 시 scan이 자동 등록
│   ├── dao/                  # 데이터 접근 — 여러 api에서 재조합
│   └── utils/response.js     # notFound / badRequest / unauthorized / serverError
└── app/                      # 프론트엔드 (vue-zero)
    ├── index.html
    ├── pages/                # pages.json으로 라우트 자동 등록
    ├── components/           # components.json으로 전역 등록
    ├── layouts/
    └── composables/
```

## 개발 명령어

```bash
wrangler dev     # 로컬 개발 (http://localhost:8787)
wrangler deploy  # 프로덕션 배포
npm run scan     # pages.json, components.json, _registry.js 갱신
```

---

## vue-zero 규칙

### 규칙 1 — 파일 등록은 scan이 자동 처리

`.vue` 또는 `server/api/*.js` 파일을 추가/삭제하면 `npm run scan` 실행.
Claude Code 사용 시 hook이 자동 실행하므로 수동 실행 불필요.

### 규칙 2 — Options API만, scoped 금지

`<script setup>`, TypeScript, Composition API 사용 금지. `<style scoped>` 금지 — 클래스명으로 구분.

### 규칙 3 — 레이아웃

`layouts/default.vue` → 모든 페이지에 자동 적용. `layout: 'admin'` 또는 `layout: false`로 페이지별 변경.

### 규칙 4 — .vue 내부에 `<template>` 태그 중첩 금지

vue-zero는 정규식으로 SFC를 파싱하므로 `.vue` 파일 안에 `<template>` 태그를 중첩하면 파싱이 조기 종료됩니다.
`<template v-for>`, `<template v-if>` 등 Vue 래퍼 태그는 반드시 `<div>` 또는 다른 실제 HTML 태그로 대체하세요.

```html
<!-- 금지 — 파싱 조기 종료 유발 -->
<template v-for="item in list" :key="item.id">...</template>

<!-- 올바름 -->
<div v-for="item in list" :key="item.id">...</div>
```

### 규칙 5 — 404, title, composables

- `pages/404.vue` → 자동 catch-all. pages.json에 등록하지 않음. 인증 사용 시 `auth: false` 필수
- `title: '페이지명'` → document.title 자동 설정
- `composables/` → 자동 등록 없음, 직접 import

---

## API 추가 패턴

2단계로 추가. scan이 `server/_registry.js`를 자동 생성하므로 `server/index.js` 수정 불필요.

**1. `server/dao/[리소스].js` — DAO 클래스**

```js
export default class PostsDao {
  constructor(env) { this.env = env }
  findAll() { return [] }
  findById(id) { return null }
}
```

**2. `server/api/[리소스].js` — 엔드포인트**

```js
import { Hono } from 'hono'
import PostsDao from '../dao/posts.js'
import { notFound } from '../utils/response.js'

const router = new Hono()

router.get('/', (c) => {
  const dao = new PostsDao(c.env)
  return c.json({ posts: dao.findAll() })
})

router.get('/:id', (c) => {
  const dao = new PostsDao(c.env)
  const post = dao.findById(c.req.param('id'))
  if (!post) return notFound(c)
  return c.json({ post })
})

export default router
```

## 인증

> 인증 미사용 시 이 섹션 삭제.

### 활성화

```js
// app/index.html
VueZero.createApp({ auth: { enabled: true, loginPage: '/login' } })
```

### 동작 방식

`auth.enabled: true`이면 **모든 페이지가 기본적으로 보호**됩니다.
공개로 열어야 하는 페이지에만 `auth: false`를 명시합니다.

```js
// pages/login.vue — 공개 페이지
export default {
  auth: false,
  layout: false,
}
```

```js
// pages/dashboard.vue — 보호 페이지 (별도 표기 불필요)
export default {
  title: '대시보드',
}
```

미인증 상태로 보호 페이지 접근 시 `loginPage`(`/login`)로 자동 리다이렉트됩니다.
로그인 성공 후 `localStorage.token`에 JWT를 저장하면 인증 상태가 됩니다.

### API 보호

```js
// server/api/users.js
import { authMiddleware } from '../middleware/auth.js'

router.get('/me', authMiddleware, (c) => {
  const user = c.get('user')  // JWT 페이로드
  return c.json({ user })
})
```

### 토큰

- 저장: `localStorage.setItem('token', jwt)`
- 요청: `Authorization: Bearer <token>` 헤더
- 만료: JWT `exp` 클레임 기준 자동 체크 (만료 시 자동 제거 후 로그인 리다이렉트)

## 외부 라이브러리

| 라이브러리 | CDN |
|-----------|-----|
| Vue 3 | unpkg.com/vue@3/dist/vue.global.prod.js |
| Vue Router 4 | unpkg.com/vue-router@4/dist/vue-router.global.prod.js |
| vue-zero | unpkg.com/vue-ai-first/dist/vue-zero.js |
