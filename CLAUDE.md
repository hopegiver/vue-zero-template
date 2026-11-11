# vue-zero-template - AI 개발 가이드

> vue-zero 프레임워크의 공식 템플릿 프로젝트. 풀스택 데모 앱과 개발 환경을 포함.

## 새 세션 부트스트랩

`STATUS.md`(라이브 상태) + 이 `CLAUDE.md`(구조·규칙)로 대부분 충분. 깊은 이력은 malgnai-hub `project_get_context`.

**STATUS.md 재작성은 다음 6가지 상황으로 제한한다** — 그 외 평범한 진행 중에는 건드리지 않는다:
①중요한 작업 완료 ②WBS 단계 변경 ③중요한 설계 결정 ④blocker 발생/해결 ⑤세션 종료 ⑥context compact 직전.
그 외에는 malgnai-hub `work_record`/`decision_record`/`issue_record`에만 기록하고 STATUS.md는 그대로 둔다.

**필수 규율:** 주요 결정/이슈/교훈은 malgnai-hub에 기록.

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
├── bin/                      # scan.js(자동 등록) / doctor.js(정적 검사) / hook-scan.js
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
    └── assets/
        ├── js/vue-zero.js    # 프레임워크
        └── js/utils.js       # 전역 유틸 함수 (useApi 등)
```

## 개발 명령어

```bash
wrangler dev     # 로컬 개발 (http://localhost:8004)
npm run deploy   # 프로덕션 배포 = scan → wrangler deploy (매니페스트를 항상 최신으로 올린다)
npm run scan     # pages.json, components.json, vz-manifest.json, _registry.js 갱신
npm run scan -- --check  # 파일을 쓰지 않고 vz-manifest.json 이 최신인지만 검사 (E_MANIFEST_STALE, 위반 시 exit 3)
npm run doctor   # .vue 정적 검사 (규칙 위반 시 file:line CODE + hint 출력, 없으면 무출력)
npm run test:unit # doctor 단위 테스트 (node --test)
npm test         # Playwright E2E (정기 회귀 테스트)
```

## 브라우저 검증 방침

- **단발성 확인**(화면 한 번 열어보기, 동작/네트워크 점검, 스크린샷): ego-browser 사용
- **정기·반복 테스트**(회귀 방지, CI): Playwright E2E (`tests/`, `npm test`)
- 단발 확인에서 잡은 중요한 시나리오는 Playwright 테스트로 승격해 회귀를 막는다.

---

## vue-zero 규칙

### 규칙 1 — 파일 등록은 scan이 자동 처리

`.vue` 또는 `server/api/*.js` 파일을 추가/삭제하면 `npm run scan` 실행.
Claude Code 사용 시 hook이 자동 실행하므로 수동 실행 불필요.

### 규칙 1-1 — doctor: 편집 직후 정적 피드백

`.vue`를 Write/Edit하면 hook이 scan 후 `bin/doctor.js`를 실행한다. 위반·경고가 있으면 **stderr + exit 2**(`file:line CODE message` + `hint:`)로 돌려준다(PostToolUse의 exit 2는 편집을 되돌리지 않고 피드백만 준다). 피드백이 오면 hint대로 즉시 고친다. 전체 점검은 `npm run doctor`. 메시지·hint는 런타임과 같은 영어이고, 문제가 없으면 무출력이다.

doctor 종료 코드: `0` 문제 없음 또는 경고만(stdout), `3` 위반, `70` doctor 내부 오류. 내부 오류는 위반이 아니므로 hook은 편집을 막지 않고 1줄 안내만 남긴다.

코드는 런타임(`package`)과 같은 문제에 같은 이름이다. 레벨은 코드명이 아니라 출력의 `(warn)` 표시로 구분한다.

| 코드 | 레벨 | 의미 |
|------|------|------|
| `E_SCRIPT_SETUP` | error | `<script setup>` 사용 |
| `E_SCRIPT_TS` | error | `lang="ts"`/`tsx` 사용 |
| `E_STYLE_SCOPED` | warn | `<style scoped>` 사용 |
| `E_RELATIVE_IMPORT` | error | script 안 상대 경로 `import`/`export … from` |
| `E_BARE_IMPORT` | error | script 안 베어 지정자 `import`/`export … from` (문자열·템플릿 리터럴·주석 속은 제외) |
| `E_RESERVED_TAG` | error | pages(라우트 이름)·components(파일명)가 런타임 `HTML_RESERVED` 태그와 동일 (`table.vue`, `Button.vue`) |
| `E_LOGIN_PAGE_PROTECTED` | error | auth 활성인데 loginPage(미설정 시 `/login`, `/`는 `index`)에 `auth: false` 없음 |
| `E_NO_EXPORT_DEFAULT` | error | doctor 전용: `<script>`에 `export default` 없음 |
| `E_COMPOSABLES_DIR` | error | doctor 전용: `composables/` 디렉터리 존재 |
| `E_MANIFEST_STALE` | error | doctor·`scan --check` 전용(프로젝트 전체 검사에서만): `vz-manifest.json` 의 해시·목록이 실제 파일과 다름, 또는 `manifest` 옵션을 켰는데 파일이 없음 |

404/error 페이지의 `auth: false` 누락은 검사하지 않는다. 런타임은 보호된 404를 로그인으로 보낼 뿐 루프가 아니고, `error.vue`는 인증 가드를 거치지 않는다.

doctor는 오탐이 없는 규칙만 검사한다(미등록 태그, 템플릿 표현식 등은 검사하지 않음). 확신이 없는 구간은 잡지 않는다.

### 자주 어기는 규칙 (증상 → 원인 → 수정)

| 증상 | 원인 | 수정 |
|------|------|------|
| 컴포넌트가 빈 화면 / 로드 실패 | `<script setup>`·`lang="ts"`·`export default` 누락 | Options API + `export default {}` |
| `import` 줄에서 SyntaxError | `.vue`는 Blob URL로 실행되어 모듈 import 불가 | 전역 `utils.js` 함수, 또는 `index.html`의 `list` 배열에 라이브러리 URL을 추가해 그 전역 사용 |
| 태그를 컴포넌트로 못 씀 / 네이티브 요소로 렌더 | 파일명이 `Button` 등 HTML 태그와 동일 | `AppButton`처럼 접두사 |
| 로그인 페이지 무한 리다이렉트 | auth 활성인데 `auth: false` 없음 | 해당 페이지에 `auth: false` |
| 새 페이지/컴포넌트가 안 뜸 | scan 미실행 | `npm run scan` |
| 배포 후에도 옛 `.vue` 가 보임 / 새 페이지가 404 | `vz-manifest.json` 이 오래됨(scan 없이 `wrangler deploy` 직접 실행, 훅 미동작 환경에서 편집) → 브라우저는 매니페스트의 해시 키로 캐시한 옛 파일을 계속 씀. `npm run doctor`/`scan -- --check` 가 `E_MANIFEST_STALE` | `npm run scan` 후 `npm run deploy` |
| 콘솔에 `E_MANIFEST_FETCH` 경고 | 배포물에 `vz-manifest.json` 이 없거나 JSON 이 깨짐(앱은 pages.json 으로 폴백해 동작은 함, 느릴 뿐) | `npm run scan`, `app/vz-manifest.json` 이 배포되는지 확인 |
| 같은 페이지에서 `/users/1`→`/users/2`로 가도 데이터 그대로 | `mounted`에서만 조회 (컴포넌트 재사용) | 아래 `watch` 규칙 |
| 배포 후에도 옛 화면 | 브라우저/CDN의 HTTP 캐시 | 아래 HTTP 캐시 |
| 콘솔 경고가 안 보임 | prod 빌드 로드 | localhost는 자동 dev 빌드. 다른 호스트는 `?vzdev` 추가 |

### 규칙 1-2 — 파라미터가 바뀌면 `watch`로 재조회

같은 페이지 컴포넌트는 라우트 파라미터·쿼리만 바뀌면 **재생성되지 않아** `mounted`가 다시 실행되지 않는다. 라우트 의존 데이터는 `watch`로 다시 불러온다.

```js
export default {
  data() { return { user: null, error: null } },
  watch: {
    '$route.params.id': { immediate: true, handler() { this.load() } }, // immediate로 mounted 대체
  },
  methods: {
    async load() {
      const { data, error } = await useApi('/api/users/' + this.$route.params.id)
      this.error = error; this.user = error ? null : data.user
    },
  },
}
```

### 규칙 1-3 — 전역 상태는 `Vue.reactive`

여러 페이지가 공유하는 상태(현재 사용자 등)는 `assets/js/utils.js`에 `Vue.reactive` 객체로 둔다(함수 선언은 그 자체로 전역).

```js
// utils.js
const appState = Vue.reactive({ user: null })
window.appState = appState   // const는 window 등록 필요
function resetAppState() { appState.user = null }
```

`.vue`에서는 `data() { return { state: appState } }`로 노출하면 반응형으로 갱신된다.
**로그아웃·토큰 만료 시** `localStorage.removeItem('token')`과 함께 `resetAppState()`로 전역 상태를 반드시 비운다(남아 있으면 다음 로그인 사용자에게 이전 데이터가 보임). 사용자별 목록 등 페이지 로컬 데이터는 페이지 이동 시 컴포넌트가 새로 만들어지므로 자동 초기화된다.

### 매니페스트(`vz-manifest.json`)와 배포

`npm run scan` 이 `app/vz-manifest.json` 을 만든다(형식 v1). 페이지·컴포넌트 목록, `404`/`error` 존재 여부, `.vue` 마다 내용 해시(sha256 앞 10자), 페이지별 레이아웃·사용 컴포넌트(`deps`)가 들어 있다. `index.html` 의 `createApp({ manifest: true })` 가 이를 쓴다. 효과:
- 부팅 때 파일 1개(항상 재검증)로 `pages.json`·`components.json`·404/error 확인을 대신한다.
- 운영 호스트에서는 해시가 같은 `.vue` 를 브라우저 Cache Storage 에서 읽어, 재방문 때 `.vue` 네트워크 요청이 0건이다. 해시가 바뀐 파일만 다시 받는다. 서버의 `_headers`/캐시 설정은 필요 없다.
- localhost 와 `?vzdev` 에서는 해시 캐시를 쓰지 않는다(편집 중 stale 방지).
- 매니페스트가 없거나 틀려도 앱은 매니페스트 없이 동작한다(요청이 늘 뿐).

**배포 전 반드시 scan**: 매니페스트가 실제 파일과 다르면 운영에서 옛 소스가 캐시에서 나갈 수 있다. `npm run deploy` 는 scan → `wrangler deploy` 순으로 실행하므로 이 명령으로 배포한다(`wrangler deploy` 를 직접 실행하지 않는다). 훅이 `.vue` 편집마다 scan 을 돌려도, 훅이 없는 환경·터미널 편집·git 병합 뒤에는 어긋날 수 있다. `npm run scan -- --check` 는 쓰기 없이 검사만 한다.

### HTTP 캐시와 배포

정적 파일은 브라우저·CDN에 캐시된다. 배포 후 갱신이 안 보이면 하드 리로드로 확인하고, 운영 중에는 파일 URL에 버전 쿼리(`vue-zero.js?v=1.3.1`)를 붙이거나 `Cache-Control`을 조정한다.

### 규칙 2 — Options API만, scoped 금지 (doctor가 검사)

`<script setup>`, TypeScript, Composition API 사용 금지. `<style scoped>` 금지 — 클래스명으로 구분.

### 규칙 3 — 레이아웃

`layouts/default.vue` → 모든 페이지에 자동 적용. `layout: 'admin'` 또는 `layout: false`로 페이지별 변경.

### 규칙 4 — 컴포넌트는 재사용·책임이 분명할 때 분리

vue-zero는 컴포넌트를 **지연 로딩**합니다. 앱 시작 시 fetch하지 않고, 페이지(또는 레이아웃)가 템플릿에서 쓰는 컴포넌트만 그 페이지를 열 때 받습니다(하위 컴포넌트 포함). 따라서 등록된 컴포넌트의 **전체 개수**는 초기 로딩에 영향을 주지 않습니다.

남는 비용은 **한 페이지가 쓰는 컴포넌트 수**입니다. 파일마다 요청 1건과 파싱이 들고, 하위 컴포넌트는 부모를 받은 뒤에야 알 수 있어 직렬로 이어집니다. 그래서 너무 잘게 쪼개지는 않습니다.

**컴포넌트로 만드는 기준**

- 2개 이상의 페이지에서 공통으로 쓰는 UI
- 한 페이지 안이라도 책임이 분명하고 props/emit 경계가 깔끔한 큰 덩어리(모달, 테이블 등)

```
좋은 예: UserCard, AppButton, DataTable, Modal
나쁜 예: 한 번만 쓰는 태그 한두 개짜리 조각 → 페이지 안에 인라인으로 작성
```

주의: `<component :is="...">`처럼 템플릿에서 이름을 찾을 수 없는 동적 사용은 렌더 시점에 로드되어, 첫 표시가 잠깐 늦을 수 있습니다.

컴포넌트를 추가하면 `npm run scan` 실행 (hook이 자동 처리).

### 규칙 5 — 404, title, 유틸

- `pages/404.vue` → 자동 catch-all. pages.json에 등록하지 않음. 인증 사용 시 `auth: false` 필수
- `title: '페이지명'` → document.title 자동 설정
- **`composables/` 사용 금지** — vue-zero는 Blob URL로 `.vue`를 실행하므로 ES module import가 불가능. Vue composable 패턴은 동작하지 않는다.
- **유틸 함수는 `assets/js/utils.js`에 추가** — `index.html`의 `list`(vzLoad가 Vue → vue-router → vue-zero → utils 순서로 실행)로 로드되어 전역 함수로 사용. Vue에 의존하는 외부 라이브러리도 정적 `<script>` 태그가 아니라 이 `list`에 추가한다(정적 태그는 Vue보다 먼저 실행될 수 있음). import 불필요.

```js
// .vue에서 import 없이 바로 사용
async mounted() {
  const { data, error } = await useApi('/api/users')
  if (error) { this.error = error; return }
  this.users = data.users
}
```

새 유틸 함수가 필요하면 `assets/js/utils.js`에 추가한다. 파일을 새로 만들지 않는다.

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
vzLoad(function () {
  VueZero.createApp({ auth: { enabled: true, loginPage: '/login' } })
})
```

`vzLoad`는 index.html이 정의한다. vue → vue-router → vue-zero → utils 순서로 스크립트를 `async=false`로 동적 삽입하고(병렬 다운로드, 순서 실행), 모두 실행된 뒤 콜백을 호출한다. `document.write`는 쓰지 않는다.

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
| Vue 3 | unpkg.com/vue@3/dist/vue.global(.prod).js — `index.html`이 localhost/`?vzdev`는 dev, 그 외 prod 선택 |
| Vue Router 4 | unpkg.com/vue-router@4/dist/vue-router.global(.prod).js — 위와 동일 |
| vue-zero | unpkg.com/vue-zero-ai/dist/vue-zero.js |
