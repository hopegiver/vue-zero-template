import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkSource, run, format } from './doctor.js'

const here = dirname(fileURLToPath(import.meta.url))
const OK = `<template><div>ok</div></template>\n<script>\nexport default {\n  data() { return {} }\n}\n</script>\n`
const codes = (src, ctx, rel = 'pages/x.vue') => checkSource('x.vue', src, ctx, rel).map(i => i.code)

test('정상 파일은 0건', () => {
  assert.deepEqual(codes(OK), [])
  assert.deepEqual(codes('<template><p>only</p></template>'), [])
})
test('script setup', () => assert.deepEqual(codes(OK.replace('<script>', '<script setup>')), ['E_SCRIPT_SETUP']))
test('lang ts / tsx', () => {
  assert.deepEqual(codes(OK.replace('<script>', '<script lang="ts">')), ['E_SCRIPT_TS'])
  assert.deepEqual(codes(OK.replace('<script>', "<script lang='tsx'>")), ['E_SCRIPT_TS'])
})
test('style scoped는 E_STYLE_SCOPED, 레벨은 warn', () => {
  const r = checkSource('x.vue', OK + '<style scoped>a{}</style>', {}, 'pages/x.vue')
  assert.deepEqual(r.map(i => [i.code, i.level]), [['E_STYLE_SCOPED', 'warn']])
  assert.match(format(r), /E_STYLE_SCOPED \(warn\) /)
})
test('상대 import', () => {
  const r = checkSource('x.vue', OK.replace('export default', "import a from './a.js'\nexport default"), {}, 'pages/x.vue')
  assert.deepEqual(r.map(i => [i.code, i.line]), [['E_RELATIVE_IMPORT', 3]])
})
test('베어 import / 여러 줄 / side-effect / export-from', () => {
  const pre = (s) => OK.replace('export default', s + '\nexport default')
  assert.deepEqual(codes(pre("import { ref } from 'vue'")), ['E_BARE_IMPORT'])
  assert.deepEqual(codes(pre("import {\n a,\n b\n} from 'lodash'")), ['E_BARE_IMPORT'])
  assert.deepEqual(codes(pre("import 'x.css'")), ['E_BARE_IMPORT'])
  assert.deepEqual(codes(pre("export { a } from '../a.js'")), ['E_RELATIVE_IMPORT'])
})
test('오탐 방지: 주석/동적 import/문자열 속 import', () => {
  const pre = (s) => OK.replace('export default', s + '\nexport default')
  assert.deepEqual(codes(pre("// import a from './a.js'")), [])
  assert.deepEqual(codes(pre("/* import a from 'a' */")), [])
  assert.deepEqual(codes(pre("const important = 1; const x = () => import('./a.js')")), [])
  assert.deepEqual(codes(OK.replace('{}', "'import x from y'")), [])
  // 템플릿 리터럴 안 줄 머리 import (여러 줄, ${} 중첩 포함)
  assert.deepEqual(codes(pre("const t = `\nimport x from \"y\"\n${1 + 1}\nimport z from './z.js'\n`")), [])
  assert.deepEqual(codes(pre("const t = `a ${ {k: 1}.k } \nimport x from 'y'`")), [])
  // 템플릿 리터럴이 끝난 뒤의 진짜 import 는 잡는다
  assert.deepEqual(codes(pre("const t = `x`\nimport x from 'y'")), ['E_BARE_IMPORT'])
  // 정규식 리터럴 / 블록 문자열 안
  assert.deepEqual(codes(pre("const r = /import a from 'b'/; const s = 'it\\'s'\n")), [])
})
test('export default 누락', () => assert.deepEqual(codes('<template/>\n<script>\nconst a = 1\n</script>'), ['E_NO_EXPORT_DEFAULT']))
test('예약 태그는 런타임 HTML_RESERVED 와 같은 목록으로 pages 와 components 모두 검사', () => {
  assert.deepEqual(codes(OK, {}, 'components/Button.vue'), ['E_RESERVED_TAG'])
  assert.deepEqual(codes(OK, {}, 'components/AppButton.vue'), [])
  assert.deepEqual(codes(OK, {}, 'pages/table.vue'), ['E_RESERVED_TAG'])
  assert.deepEqual(codes(OK, {}, 'pages/form.vue'), ['E_RESERVED_TAG'])
  assert.deepEqual(codes(OK, {}, 'pages/users/table.vue'), []) // 라우트 이름 users-table
  assert.deepEqual(codes(OK, {}, 'pages/about.vue'), [])
  // 런타임 목록에 없는 이름(menu/title/data/time/map/path)은 막지 않는다
  for (const n of ['Menu', 'Title', 'Data', 'Time', 'Map', 'Path']) assert.deepEqual(codes(OK, {}, `components/${n}.vue`), [])
})
test('auth 활성 시 loginPage 에 auth:false 필요 (404/error 는 검사하지 않음)', () => {
  const ctx = { authEnabled: true, publicPages: ['pages/login.vue'] }
  assert.deepEqual(codes(OK, ctx, 'pages/login.vue'), ['E_LOGIN_PAGE_PROTECTED'])
  assert.deepEqual(codes(OK.replace('export default {', 'export default {\n  auth: false,'), ctx, 'pages/login.vue'), [])
  assert.deepEqual(codes(OK, ctx, 'pages/dashboard.vue'), [])
  assert.deepEqual(codes(OK, ctx, 'pages/error.vue'), [])
  assert.deepEqual(codes(OK, ctx, 'pages/404.vue'), [])
  assert.deepEqual(codes(OK, { authEnabled: false, publicPages: ctx.publicPages }, 'pages/login.vue'), [])
})
test('loginPage 기본값 /login, "/" 는 index', () => {
  const d = mkdtempSync(join(tmpdir(), 'doctor-'))
  try {
    mkdirSync(join(d, 'app/pages'), { recursive: true })
    const html = (opts) => writeFileSync(join(d, 'app/index.html'), `<script>VueZero.createApp({ auth: { enabled: true${opts} } })</script>`)
    writeFileSync(join(d, 'app/pages/login.vue'), OK)
    writeFileSync(join(d, 'app/pages/index.vue'), OK)
    html('')
    assert.deepEqual(run([join(d, 'app')], join(d, 'app')).map(i => i.file.split('/').pop()), ['login.vue'])
    html(", loginPage: '/'")
    assert.deepEqual(run([join(d, 'app')], join(d, 'app')).map(i => i.file.split('/').pop()), ['index.vue'])
    html(", loginPage: '/login/'")
    assert.deepEqual(run([join(d, 'app')], join(d, 'app')).map(i => i.file.split('/').pop()), ['login.vue'])
  } finally { rmSync(d, { recursive: true, force: true }) }
})
test('출력 형식', () => {
  const t = format(checkSource('a.vue', OK.replace('<script>', '<script setup>'), {}, 'pages/a.vue'))
  assert.match(t, /^a\.vue:2 E_SCRIPT_SETUP .+\n {2}hint: .+/)
  assert.doesNotMatch(t, /[가-힣]/) // 런타임과 같은 영어
})
test('프로젝트 검사: composables/ 디렉터리 + auth 설정 파싱', () => {
  const d = mkdtempSync(join(tmpdir(), 'doctor-'))
  try {
    mkdirSync(join(d, 'app/pages'), { recursive: true })
    mkdirSync(join(d, 'app/composables'))
    writeFileSync(join(d, 'app/index.html'), "<script>VueZero.createApp({ auth: { enabled: true, loginPage: '/signin' } })</script>")
    writeFileSync(join(d, 'app/pages/signin.vue'), OK)
    writeFileSync(join(d, 'app/pages/ok.vue'), OK)
    const r = run([join(d, 'app')], join(d, 'app')).map(i => i.code).sort()
    assert.deepEqual(r, ['E_COMPOSABLES_DIR', 'E_LOGIN_PAGE_PROTECTED'])
  } finally { rmSync(d, { recursive: true, force: true }) }
})
test('CLI 종료 코드: 위반 3, 경고만 0(stdout), 내부 오류 70', () => {
  const d = mkdtempSync(join(tmpdir(), 'doctor-'))
  const cli = join(here, 'doctor.js')
  try {
    mkdirSync(join(d, 'app/pages'), { recursive: true })
    writeFileSync(join(d, 'bad.vue'), OK.replace('<script>', '<script setup>'))
    writeFileSync(join(d, 'warn.vue'), OK + '<style scoped>a{}</style>')
    const bad = spawnSync('node', [cli, join(d, 'bad.vue')], { encoding: 'utf-8', cwd: d })
    assert.equal(bad.status, 3); assert.match(bad.stderr, /E_SCRIPT_SETUP/)
    const warn = spawnSync('node', [cli, join(d, 'warn.vue')], { encoding: 'utf-8', cwd: d })
    assert.equal(warn.status, 0); assert.match(warn.stdout, /E_STYLE_SCOPED \(warn\)/)
    // 내부 오류: 읽을 수 없는 .vue
    writeFileSync(join(d, 'noread.vue'), OK); chmodSync(join(d, 'noread.vue'), 0)
    const crash = spawnSync('node', [cli, join(d, 'noread.vue')], { encoding: 'utf-8', cwd: d })
    assert.equal(crash.status, 70); assert.match(crash.stderr, /doctor internal error/)
  } finally { rmSync(d, { recursive: true, force: true }) }
})
test('템플릿 앱(app/) 자체는 0건 + CLI는 무출력 exit 0', () => {
  const cwd = join(here, '..')
  assert.deepEqual(run([], join(cwd, 'app')), [])
  const p = spawnSync('node', ['bin/doctor.js'], { cwd, encoding: 'utf-8' })
  assert.equal(p.status, 0); assert.equal(p.stdout + p.stderr, '')
})
