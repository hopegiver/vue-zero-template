import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// vz-manifest.json 생성기(scan.js) 골든 테스트. 같은 픽스처·기대 파일이 vue-zero 패키지 저장소의
// test/fixtures/manifest-golden 에도 있고, 거기서는 test/scripts/gen-manifest.mjs 가 같은 출력을 내는지 검증한다.
const here = dirname(fileURLToPath(import.meta.url))
const scan = join(here, 'scan.js')
const golden = join(here, '..', 'tests', 'fixtures', 'manifest-golden')
const read = (p) => readFileSync(p, 'utf-8')

function sandbox(copyGolden = true) {
  const dir = mkdtempSync(join(tmpdir(), 'vz-scan-'))
  if (copyGolden) cpSync(join(golden, 'app'), join(dir, 'app'), { recursive: true })
  return dir
}
const runScan = (cwd, ...args) => spawnSync(process.execPath, [scan, ...(args.length ? args : ['app'])], { cwd, encoding: 'utf-8' })
const manifestOf = (dir) => JSON.parse(read(join(dir, 'app', 'vz-manifest.json')))
const walk = (d) => readdirSync(d).flatMap((e) => (statSync(join(d, e)).isDirectory() ? walk(join(d, e)) : [join(d, e)]))
const put = (dir, rel, body) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), body) }
const sfc = (tpl, script = 'export default {}') => `<template>${tpl}</template>\n<script>\n${script}\n</script>\n`

test('골든: 픽스처 앱의 scan 출력 == 기대 vz-manifest.json / pages.json / components.json (바이트 동일)', () => {
  const dir = sandbox()
  try {
    const r = runScan(dir)
    assert.equal(r.status, 0, r.stderr)
    assert.equal(read(join(dir, 'app', 'vz-manifest.json')), read(join(golden, 'expected', 'vz-manifest.json')))
    assert.equal(read(join(dir, 'app', 'pages', 'pages.json')), read(join(golden, 'expected', 'pages.json')))
    assert.equal(read(join(dir, 'app', 'components', 'components.json')), read(join(golden, 'expected', 'components.json')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('멱등: 두 번째 실행은 파일을 바꾸지 않고 "no changes" 를 출력한다', () => {
  const dir = sandbox()
  try {
    runScan(dir)
    const before = read(join(dir, 'app', 'vz-manifest.json'))
    const r = runScan(dir)
    assert.match(r.stdout, /vz-manifest\.json — no changes/)
    assert.equal(read(join(dir, 'app', 'vz-manifest.json')), before)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('CRLF 정규화: 모든 .vue 를 CRLF 로 바꿔도 해시·build·전체 출력이 같다', () => {
  const dir = sandbox()
  try {
    for (const f of walk(join(dir, 'app')).filter((p) => p.endsWith('.vue'))) writeFileSync(f, read(f).replace(/\n/g, '\r\n'))
    runScan(dir)
    assert.equal(read(join(dir, 'app', 'vz-manifest.json')), read(join(golden, 'expected', 'vz-manifest.json')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('내용이 1바이트 바뀌면 그 파일의 해시와 build 만 바뀐다', () => {
  const dir = sandbox()
  try {
    runScan(dir)
    const a = manifestOf(dir)
    writeFileSync(join(dir, 'app', 'components', 'Avatar.vue'), read(join(dir, 'app', 'components', 'Avatar.vue')) + ' ')
    runScan(dir)
    const b = manifestOf(dir)
    assert.notEqual(b.build, a.build)
    const changed = Object.keys(a.files).filter((k) => a.files[k] !== b.files[k])
    assert.deepEqual(changed, ['components/Avatar.vue'])
    assert.deepEqual(b.deps, a.deps)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('deps: 전이 폐포 · 순환 종료 · 레이아웃 컴포넌트 포함 · layout:false 는 레이아웃 제외 · 동적 layout 은 deps 생략', () => {
  const dir = sandbox()
  try {
    runScan(dir)
    const m = manifestOf(dir)
    assert.deepEqual(m.deps['pages/about.vue'], { layout: 'admin', components: ['AdminNav', 'AppButton', 'AppHeader', 'Avatar', 'UserCard'] })
    assert.deepEqual(m.deps['pages/users/[id].vue'], { layout: false, components: ['Avatar', 'UserCard'] })
    assert.equal('pages/dynamic.vue' in m.deps, false)
    assert.equal('pages/error.vue' in m.deps, false)
    assert.equal(m.has404, true)
    assert.equal(m.hasError, true)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('layout 판정: 큰따옴표 · 주석 처리된 layout · 최상위 키 2회(판정 불가) · data() 안의 layout 키 무시', () => {
  const dir = sandbox(false)
  try {
    put(dir, 'app/pages/a.vue', sfc('<div/>', 'export default {\n  layout: "x",\n}'))
    put(dir, 'app/pages/b.vue', sfc('<div/>', "export default {\n  // layout: 'nope'\n  data() { return {} }\n}"))
    put(dir, 'app/pages/c.vue', sfc('<div/>', "export default {\n  layout: 'p',\n  data() { return { layout: 'q' } }\n}"))
    put(dir, 'app/pages/d.vue', '<template><div/></template>\n')
    put(dir, 'app/pages/e.vue', sfc('<div/>', "export default {\n  data() { return { layout: 'q' } }\n}"))
    put(dir, 'app/pages/f.vue', sfc('<div/>', "export default Vue.defineComponent({ layout: 'q' })"))
    put(dir, 'app/pages/g.vue', sfc('<div/>', "export default {\n  data() { return { s: '{' } },\n  layout: 'z',\n}"))
    put(dir, 'app/pages/h.vue', sfc('<div/>', "export default {\n  layout: 'p',\n  layout: false,\n}"))
    runScan(dir)
    const m = manifestOf(dir)
    assert.equal(m.deps['pages/a.vue'].layout, 'x')
    assert.equal(m.deps['pages/b.vue'].layout, 'default')
    assert.equal(m.deps['pages/c.vue'].layout, 'p')
    assert.equal(m.deps['pages/d.vue'].layout, 'default')
    assert.equal(m.deps['pages/e.vue'].layout, 'default')
    assert.equal('pages/f.vue' in m.deps, false)
    assert.equal(m.deps['pages/g.vue'].layout, 'z')
    assert.equal('pages/h.vue' in m.deps, false)
    assert.equal(m.has404, false)
    assert.deepEqual(m.components, [])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('pages 디렉토리가 없으면 매니페스트를 만들지 않는다 (server 만 있는 프로젝트)', () => {
  const dir = sandbox(false)
  try {
    mkdirSync(join(dir, 'app'), { recursive: true })
    runScan(dir)
    assert.throws(() => read(join(dir, 'app', 'vz-manifest.json')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// ── scan --check / E_MANIFEST_STALE ─────────────────────────────────────────
test('scan --check: 최신이면 무출력 exit 0, .vue 를 고치면 E_MANIFEST_STALE exit 3 이고 파일은 쓰지 않는다', () => {
  const dir = sandbox()
  try {
    runScan(dir)
    const fresh = runScan(dir, '--check')
    assert.equal(fresh.status, 0, fresh.stderr)
    assert.equal(fresh.stdout + fresh.stderr, '')
    const before = read(join(dir, 'app', 'vz-manifest.json'))
    writeFileSync(join(dir, 'app', 'components', 'Avatar.vue'), read(join(dir, 'app', 'components', 'Avatar.vue')) + '\n<!-- edited -->\n')
    const stale = runScan(dir, '--check')
    assert.equal(stale.status, 3)
    assert.match(stale.stderr, /E_MANIFEST_STALE/)
    assert.match(stale.stderr, /components\/Avatar\.vue/)
    assert.match(stale.stderr, /hint: .*npm run scan/)
    assert.equal(read(join(dir, 'app', 'vz-manifest.json')), before) // --check 는 읽기 전용
    assert.equal(runScan(dir).status, 0) // scan 이 갱신하면
    assert.equal(runScan(dir, '--check').status, 0) // 다시 통과
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('scan --check: 파일 추가·삭제도 stale, 매니페스트가 아예 없으면 옵트인 앱에서만 stale', () => {
  const dir = sandbox()
  try {
    assert.equal(runScan(dir, '--check').status, 0) // 매니페스트 없음 + index.html 없음 = 옵트인 아님
    put(dir, 'app/index.html', '<script>VueZero.createApp({ manifest: true })</script>')
    const missing = runScan(dir, '--check')
    assert.equal(missing.status, 3)
    assert.match(missing.stderr, /E_MANIFEST_STALE.*missing/s)
    runScan(dir)
    assert.equal(runScan(dir, '--check').status, 0)
    put(dir, 'app/pages/newpage.vue', sfc('<div/>'))
    const added = runScan(dir, '--check')
    assert.equal(added.status, 3)
    assert.match(added.stderr, /pages\/newpage\.vue/)
    rmSync(join(dir, 'app', 'pages', 'newpage.vue'))
    runScan(dir)
    rmSync(join(dir, 'app', 'components', 'Avatar.vue'))
    const removed = runScan(dir, '--check')
    assert.equal(removed.status, 3)
    assert.match(removed.stderr, /components\/Avatar\.vue/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('package.json deploy 는 scan 을 먼저 돌린 뒤 wrangler deploy (scan 실패 시 배포하지 않음)', () => {
  const pkg = JSON.parse(read(join(here, '..', 'package.json')))
  assert.match(pkg.scripts.deploy, /^(npm run scan|node bin\/scan\.js) && wrangler deploy$/)
})
