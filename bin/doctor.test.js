import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
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
test('style scoped는 경고(W_)', () => assert.deepEqual(codes(OK + '<style scoped>a{}</style>'), ['W_STYLE_SCOPED']))
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
})
test('export default 누락', () => assert.deepEqual(codes('<template/>\n<script>\nconst a = 1\n</script>'), ['E_NO_EXPORT_DEFAULT']))
test('예약 태그 파일명은 components/ 에서만', () => {
  assert.deepEqual(codes(OK, {}, 'components/Button.vue'), ['E_RESERVED_TAG'])
  assert.deepEqual(codes(OK, {}, 'components/AppButton.vue'), [])
  assert.deepEqual(codes(OK, {}, 'pages/form.vue'), [])
})
test('auth 활성 시 공개 페이지에 auth:false 필요', () => {
  const ctx = { authEnabled: true, publicPages: ['pages/login.vue', 'pages/404.vue'] }
  assert.deepEqual(codes(OK, ctx, 'pages/login.vue'), ['E_LOGIN_PAGE_PROTECTED'])
  assert.deepEqual(codes(OK.replace('export default {', 'export default {\n  auth: false,'), ctx, 'pages/login.vue'), [])
  assert.deepEqual(codes(OK, ctx, 'pages/dashboard.vue'), [])
  assert.deepEqual(codes(OK, { authEnabled: false, publicPages: ctx.publicPages }, 'pages/login.vue'), [])
})
test('출력 형식', () => {
  const t = format(checkSource('a.vue', OK.replace('<script>', '<script setup>'), {}, 'pages/a.vue'))
  assert.match(t, /^a\.vue:2 E_SCRIPT_SETUP .+\n {2}hint: .+/)
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
test('템플릿 앱(app/) 자체는 0건 + CLI는 무출력 exit 0', () => {
  const cwd = join(here, '..')
  assert.deepEqual(run([], join(cwd, 'app')), [])
  const p = spawnSync('node', ['bin/doctor.js'], { cwd, encoding: 'utf-8' })
  assert.equal(p.status, 0); assert.equal(p.stdout + p.stderr, '')
})
