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

### 규칙 4 — 컴포넌트는 꼭 필요할 때만

vue-zero는 컴포넌트를 앱 초기화 시 전부 fetch·파싱합니다. 컴포넌트가 많아질수록 초기 로딩이 느려집니다.

**컴포넌트로 만드는 기준 — 2개 이상의 페이지에서 공통으로 사용되는 UI**

```
좋은 예: UserCard, AppButton, DataTable, Modal
나쁜 예: 한 페이지에서만 쓰는 섹션 → 페이지 안에 인라인으로 작성
```

컴포넌트를 추가하면 `npm run scan` 실행 (hook이 자동 처리).

### 규칙 5 — 404, title, composables

- `pages/404.vue` → 자동 catch-all. pages.json에 등록하지 않음. 인증 사용 시 `auth: false` 필수
- `title: '페이지명'` → document.title 자동 설정
- `composables/` → 자동 등록 없음, 직접 import. `useApi.js` 샘플 참고

```js
import { useApi } from '/composables/useApi.js'

async mounted() {
  const { data, error } = await useApi('/api/users')
  if (error) { this.error = error; return }
  this.users = data.users
}
```

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

### 동작 방식 — opt-out 방식 (중요)

`auth.enabled: true`이면 **모든 페이지가 기본적으로 보호**됩니다.
공개로 열어야 하는 페이지에만 `auth: false`를 명시합니다. **`auth: true`는 쓰지 않습니다.**

```js
// pages/login.vue — 반드시 auth: false 명시 (없으면 무한 리다이렉트)
export default {
  auth: false,
  layout: false,
}
```

```js
// pages/index.vue — 공개 페이지
export default {
  auth: false,
  title: '홈',
}
```

```js
// pages/dashboard.vue — 보호 페이지 (auth 생략 = 보호됨)
export default {
  title: '대시보드',
}
```

**주의:** 로그인 페이지(`loginPage`)와 공개로 열어야 할 모든 페이지에 반드시 `auth: false`를 추가해야 합니다. 빠뜨리면 미인증 사용자가 해당 페이지에 접근할 수 없습니다.

미인증 상태로 보호 페이지 접근 시 `loginPage`(`/login`)로 자동 리다이렉트됩니다.

### 로그인 / 로그아웃

**로그인** — API에서 받은 JWT를 `localStorage`에 저장하면 인증 상태가 됩니다.

```js
const data = await res.json()
localStorage.setItem('token', data.token)
this.$router.push('/')
```

**로그아웃** — `localStorage`에서 토큰을 제거하고 로그인 페이지로 이동합니다.

```js
localStorage.removeItem('token')
this.$router.push('/login')
```

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
