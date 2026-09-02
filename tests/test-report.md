# error.vue E2E 테스트 검증 보고서

## 대상

`app/pages/error.vue` — Vue Router `beforeEach` 가드 내부에서 페이지 컴포넌트 fetch/eval이 실패했을 때 catch 블록이 로드하는 에러 화면. 고정 URL 라우트가 아니며, `pages.json`에도 등록되지 않는다.

## 트리거 방법 (검증됨)

`app/assets/js/vue-zero.js` 번들 코드 직접 분석(`beforeEach` 핸들러) 결과, 페이지 컴포넌트 로드는 다음 순서로 실패할 수 있다:
1. `fetch(pageFilePath)` — 응답이 `!ok`이면 `[vue-zero] failed to fetch ... (status)` throw
2. script eval(Blob URL `import()`) — 문법 오류 시 `[vue-zero] script eval failed: ...` throw

이 예외는 `beforeEach`의 try/catch에서 잡혀 `error.vue`를 fetch+로드해 `currentError` ref에 담아 렌더링하고, `return false`로 원래 네비게이션을 취소한다(URL 불변).

**채택한 트리거**: `page.route('**/pages/users/index.vue', route => route.fulfill({ status: 500, ... }))`로 특정 페이지의 `.vue` fetch를 가로채 500을 반환시켜 `beforeEach` catch를 강제 발동. 사전에 별도 probe 스크립트(스크래치패드)로 다음을 실제 실행 확인 후 본 테스트에 반영했다:
- 콘솔에 `[vue-zero] 페이지 로드 실패: /users Error: [vue-zero] failed to fetch /pages/users/index.vue (500)` 로그 확인
- body에 "오류" / "문제가 발생했습니다" / "홈으로 돌아가기" 렌더링 확인
- 클라이언트 사이드 전환이었으므로 URL이 이전 페이지(`/about`)에 그대로 유지됨을 확인 (요구사항 "URL도 이동하지 않음"과 일치)
- "홈으로 돌아가기" 클릭 시 실제로 `/`로 정상 복귀하고 홈 콘텐츠가 렌더링됨을 확인

## 산출물

- `tests/e2e.spec.js:53-71` — `error.vue — 페이지 로드 실패 시 에러 화면 표시, URL 미변경, 홈 복귀` 테스트 추가 (기존 파일 스타일: BASE 상수, 한국어 테스트명, `page.on`/`page.route` 패턴 준수)
- 재실행 스크립트: 별도 파일을 새로 만들지 않고 기존 스캐폴드(`tests/e2e.spec.js`)에 편입했으므로 재실행은 `npx playwright test -g "error.vue"` (또는 `npx playwright test`로 전체 스위트) 그대로 사용

## 실행 결과 (실제 로그 인용)

### 1) 신규 테스트 단독 실행
```
Running 1 test using 1 worker
  ✓  1 tests/e2e.spec.js:54:1 › error.vue — 페이지 로드 실패 시 에러 화면 표시, URL 미변경, 홈 복귀 (1.8s)
  1 passed (4.1s)
```

### 2) 전체 스위트 (auth.spec.js + e2e.spec.js, `--workers=1` 순차 실행)
```
15 failed
    tests/auth.spec.js:25:1 › 미인증 — 보호 페이지 접근 시 /login 리다이렉트
    tests/auth.spec.js:31:1 › 미인증 — admin 페이지 접근 시 /login 리다이렉트
    tests/auth.spec.js:104:1 › 로그아웃 후 — 보호 페이지 다시 차단
    tests/auth.spec.js:121:1 › 만료된 토큰 — 보호 페이지 접근 시 /login 리다이렉트
    tests/e2e.spec.js:32:3 › 페이지 로드: /admin
    tests/e2e.spec.js:32:3 › 페이지 로드: /admin/members
    tests/e2e.spec.js:74:1 › 레이아웃 전환 (default → admin → default)
    tests/e2e.spec.js:88:1 › layout: false — 로그인 페이지에 레이아웃 없음
    tests/e2e.spec.js:96:1 › 같은 레이아웃 내 이동 (admin 유지)
    tests/e2e.spec.js:106:1 › 동적 라우트 파라미터 변경 (/users/1 → /users/2)
    tests/e2e.spec.js:117:1 › 히스토리 모드 — 서브페이지 새로고침
    tests/e2e.spec.js:131:1 › counter — computed, watch 동작
    tests/e2e.spec.js:148:1 › search — 쿼리스트링 동기화
    tests/e2e.spec.js:156:1 › todo — 추가, 완료, 삭제
    tests/e2e.spec.js:174:1 › gallery — 모달 열기/닫기
  29 passed (2.8m)
```
합계 44 tests (기존 43 + 신규 1). **신규 error.vue 테스트는 위 실패 목록에 없다 — 통과.**

같은 15건은 병렬 워커 실행과 `--workers=1` 순차 실행 양쪽에서 동일하게 재현되어 워커 경합에 의한 플레이키니스가 아님을 확인했다.

## 회귀 여부 판정 (claimed vs verified)

- **verified**: 이번 작업에서 코드 변경은 `tests/e2e.spec.js`에 신규 테스트 1건 추가뿐이며(`git diff --stat` 확인), 기존 43개 테스트의 본문은 문자 그대로 무수정이다. 15건 실패는 이 diff 적용 전/후 동일 목록으로 재현되어 **내 변경으로 인한 회귀가 아니다.**
- **verified 근본 원인 (참고용, 수정하지 않음 — 범위 밖)**:
  - `auth.spec.js` 4건: `app/index.html`의 `VueZero.createApp({})` 호출에 `auth: { enabled: true, loginPage: '/login' }` 옵션이 없음(현재 인증 기능 자체가 비활성화 상태) → `/dashboard` 등 보호 페이지가 미인증 상태에서도 그대로 열려 `/login` 리다이렉트를 기대하는 assertion이 실패. `git diff --ignore-space-at-eol app/index.html`으로 확인한 결과 이 파일의 실질적 diff는 주석 1줄뿐이라 최근 세션 변경이 원인이 아니라 이미 커밋된 상태의 기존 이슈로 보인다.
  - `counter`/`search`/`todo`/`gallery` 4건: 테스트가 기대하는 `.count`/`.double`/`.history`/`.page-search`/`.todo-input`/`.gallery-item` 등 클래스가 실제 `app/pages/counter.vue`(직접 확인, 클래스 없이 순수 `<p>{{ count }}</p>` 구조) 등 페이지 구현에 없음 — 테스트와 구현 간 기존 불일치.
  - `admin`/레이아웃/동적 라우트/히스토리 관련 6건은 위 auth 비활성화 이슈로 인해 페이지 콘텐츠가 예상과 달라지며 연쇄 실패한 것으로 추정(개별 원인 분석은 범위 밖이라 심층 조사는 하지 않음).
  - 이 15건은 본 요청(error.vue E2E 테스트 추가)의 범위 밖이므로 코드 수정을 진행하지 않았다. PM/사용자 승인 후 별도 작업으로 조사·수정을 권장한다.

## 환경 이슈 및 조치 (재실행에 필요한 정보)

- `pnpm install` 없이 남아있던 `node_modules`가 npm(package-lock.json)과 pnpm(pnpm-lock.yaml) 혼용 설치로 오염되어 있어 `npx playwright test` 자체가 `Playwright Test did not expect test() to be called here` 에러로 전혀 실행되지 않는 상태였다. `rm -rf node_modules && pnpm install`로 정리해 해결(프로젝트 표준인 pnpm 전용 설치로 복구, 커밋 대상 파일은 변경하지 않음).
- 로컬 머신에서 포트 8787을 무관한 다른 프로젝트(`malgnai-public`)의 `wrangler dev`가 이미 점유 중이어서(`lsof -nP -iTCP:8787` 확인), 실행 중에는 스크래치패드에 별도 `--config`(포트 18787)를 만들어 검증했고, 검증 후 `tests/e2e.spec.js`·`tests/auth.spec.js`·`playwright.config.js`는 원래 값(8787)으로 정확히 되돌렸다(`git diff --stat`로 e2e.spec.js 외 무변경 확인). 다른 세션이 8787을 계속 점유하는 동안은 로컬에서 `npx playwright test`를 그대로 돌리면 `wrangler dev`가 `Address already in use`로 실패하므로, devops/재실행자는 8787을 점유한 프로세스를 먼저 확인해야 한다.

## devops 재사용 정보

- 테스트 시점 커밋 해시: `bc1a8e8022d12f127cbcb5f9df48fa6354eea34c` (`git log --oneline`으로 존재 확인: `bc1a8e8 feat: pages/error.vue 추가 + malgn-agent 프로젝트 표준 초기화`)
- 실행한 핵심 시나리오 ID: `tests/e2e.spec.js:54` (`error.vue — 페이지 로드 실패 시 에러 화면 표시, URL 미변경, 홈 복귀`), 및 회귀 확인용으로 전체 `tests/e2e.spec.js` + `tests/auth.spec.js` (44 tests)
- 목업 처리한 외부 API: 없음. `page.route()`로 자체 서버가 서빙하는 정적 `.vue` 파일 fetch만 가로챔(외부 서드파티 API 호출 없음). CDN(unpkg/jsdelivr에서 로드하는 Vue/Bootstrap 등)은 가로채지 않고 실제 네트워크로 로드됨.
