#!/usr/bin/env node
// vue-zero doctor — .vue static check. 의존성 없음. 문제가 없으면 아무것도 출력하지 않는다.
// 오탐 위험이 큰 규칙(미등록 태그, 템플릿 표현식 파싱 등)은 의도적으로 넣지 않는다.
import { readdirSync, statSync, readFileSync, existsSync } from 'fs'
import { join, relative, basename, extname, sep } from 'path'
import { fileURLToPath } from 'url'
import { manifestIssues } from './manifest.js'

// 출처: package/src/core/RouteScanner.ts 의 HTML_RESERVED (런타임과 동일 목록 — 바꾸려면 양쪽을 함께)
const HTML_RESERVED = new Set([
  'html','body','head','base','meta','link','style','script','noscript',
  'template','slot','component',
  'div','span','p','a','br','hr','img','input','button','select','option',
  'textarea','form','label','fieldset','legend','table','thead','tbody',
  'tfoot','tr','th','td','caption','colgroup','col',
  'ul','ol','li','dl','dt','dd',
  'h1','h2','h3','h4','h5','h6',
  'header','footer','main','nav','section','article','aside',
  'details','summary','dialog','figure','figcaption',
  'video','audio','source','canvas','svg','iframe','embed','object',
  'pre','code','blockquote','strong','em','small','sub','sup','mark',
])

// 런타임(package)과 같은 문제에는 같은 코드. 레벨은 코드명이 아니라 LEVEL 로 구분한다.
const LEVEL = { E_STYLE_SCOPED: 'warn' }
const levelOf = (code) => LEVEL[code] || 'error'

const HINTS = {
  E_SCRIPT_SETUP: 'Use a plain `<script>` with `export default { ... }` (Options API).',
  E_SCRIPT_TS: 'TypeScript is not supported. Remove the `lang` attribute and write plain JS.',
  E_STYLE_SCOPED: 'Remove `scoped`; styles apply globally, so use unique class names.',
  E_RELATIVE_IMPORT: 'A .vue script runs from a Blob URL, so relative imports fail. Put shared logic in assets/js/utils.js as a global function.',
  E_BARE_IMPORT: 'import/export-from is not allowed in .vue. Add the library URL to the `list` array in app/index.html (vzLoad runs it in order, after Vue) and use its global.',
  E_NO_EXPORT_DEFAULT: 'Export the component object with `export default { ... }`.',
  E_COMPOSABLES_DIR: 'composables/ is not allowed. Add functions to assets/js/utils.js.',
  E_RESERVED_TAG: 'The name matches an HTML reserved tag. Rename the file with a prefix (e.g. AppButton, table-page) and update pages.json/components.json.',
  E_LOGIN_PAGE_PROTECTED: 'With auth enabled, the login page must be public, otherwise the redirect to it loops. Add `auth: false` to `export default { ... }`.',
}

// 주석/문자열/템플릿 리터럴을 구분해 읽는다.
// code: 주석을 같은 길이의 공백으로 바꾼 텍스트(개행 유지 → 라인 번호 보존, 문자열은 그대로)
// live[i]: i번째 문자가 실제 코드 위치(주석·문자열·템플릿 리터럴 본문 밖)이면 true
// 판단이 애매한 구간(정규식 리터럴 등)에서는 live=false 쪽으로 기운다 — 미탐이 오탐보다 낫다.
export function lex(src) {
  const n = src.length
  const out = src.split('')
  const live = new Uint8Array(n)
  const stack = [] // 템플릿 ${ } 안의 중괄호 깊이
  let i = 0, last = '' // last: 직전 의미 있는 코드 문자
  const blankRange = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' ' }
  const regexOk = () => last === '' || '(,=:[!&|?{};+-*%<>~^'.includes(last)
  while (i < n) {
    const c = src[i], d = src[i + 1]
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); const end = e < 0 ? n : e; blankRange(i, end); i = end; continue }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; blankRange(i, end); i = end; continue }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1
      i = j + 1; last = c; continue
    }
    if (c === '`' || (c === '}' && stack.length && stack[stack.length - 1] === 0)) {
      if (c === '}') stack.pop()
      let j = i + 1
      for (; j < n; j++) {
        if (src[j] === '\\') { j++; continue }
        if (src[j] === '`') { j++; break }
        if (src[j] === '$' && src[j + 1] === '{') { stack.push(0); j += 2; break }
      }
      i = j; last = '`'; continue
    }
    if (c === '/' && regexOk()) {
      let j = i + 1, cls = false
      while (j < n && src[j] !== '\n' && (cls || src[j] !== '/')) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++ }
      i = j + 1; last = '/'; continue
    }
    if (c === '{' && stack.length) stack[stack.length - 1]++
    if (c === '}' && stack.length) stack[stack.length - 1]--
    live[i] = 1
    if (!/\s/.test(c)) last = c
    i++
  }
  return { code: out.join(''), live }
}

function lineOf(text, index) {
  let n = 1
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++
  return n
}

// 페이지 파일 → 런타임 라우트 이름 (RouteScanner.fileToRoute 와 같은 규칙)
const pageRouteName = (noExt) => noExt.replace(/\//g, '-').replace(/[\[\]\.]/g, '')

// loginPage('/login', '/', '/auth/login/') → 해당하는 pages 파일 후보 (nested index 포함)
export function loginPageFiles(loginPage = '/login') {
  const p = String(loginPage).split(/[?#]/)[0].replace(/^\/+|\/+$/g, '')
  return p === '' ? ['pages/index.vue'] : [`pages/${p}.vue`, `pages/${p}/index.vue`]
}

// ctx: { authEnabled: bool, publicPages: string[] } / rel: app 기준 상대경로(예: pages/login.vue)
// publicPages 는 loginPage 파일뿐이다.
export function checkSource(file, source, ctx = {}, rel = file) {
  const out = []
  const add = (line, code, message) => out.push({ file, line, code, level: levelOf(code), message, hint: HINTS[code] })
  const relNorm = rel.split(sep).join('/')

  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  let m, hasScript = false, hasDefault = false
  while ((m = scriptRe.exec(source))) {
    hasScript = true
    const attrs = m[1]
    const line = lineOf(source, m.index)
    if (/(^|\s)setup(\s|=|$)/i.test(attrs)) add(line, 'E_SCRIPT_SETUP', '`<script setup>` is not supported.')
    if (/\blang\s*=\s*["']?(ts|tsx)\b/i.test(attrs)) add(line, 'E_SCRIPT_TS', 'TypeScript (`lang="ts"`) is not supported.')
    const bodyStart = m.index + m[0].indexOf('>') + 1
    const { code, live } = lex(m[2])
    const importRe = /^[ \t]*import\s*(?:[\w$*{][^'";]*?\bfrom\s*)?(['"])([^'"\n]+)\1/gm
    let im
    const report = (_, text, spec) => add(lineOf(source, bodyStart + im.index + im[0].search(/\S/)),
      /^[./]/.test(spec) ? 'E_RELATIVE_IMPORT' : 'E_BARE_IMPORT', text(spec))
    while ((im = importRe.exec(code))) {
      if (!live[im.index + im[0].search(/\S/)]) continue // 문자열/템플릿 리터럴 안
      report(null, (sp) => `import '${sp}' cannot be used in .vue.`, im[2])
    }
    const reexpRe = /^[ \t]*export\s*(?:\*|\{[^}]*\})\s*from\s*(['"])([^'"\n]+)\1/gm
    while ((im = reexpRe.exec(code))) {
      if (!live[im.index + im[0].search(/\S/)]) continue
      report(null, (sp) => `export ... from '${sp}' cannot be used in .vue.`, im[2])
    }
    const dm = /^[ \t]*export\s+default\b/m.exec(code)
    if (dm && live[dm.index + dm[0].search(/\S/)]) hasDefault = true
  }
  if (hasScript && !hasDefault) add(1, 'E_NO_EXPORT_DEFAULT', '`export default` is missing in <script>.')

  const styleRe = /<style\b[^>]*\bscoped\b[^>]*>/gi
  while ((m = styleRe.exec(source))) add(lineOf(source, m.index), 'E_STYLE_SCOPED', '`<style scoped>` is not supported; styles apply globally.')

  // 예약 태그: 런타임은 pages 의 라우트 이름을 검사한다. components 는 파일명 그대로 태그가 된다.
  let tagName = null
  if (/^pages\//.test(relNorm)) tagName = pageRouteName(relNorm.replace(/^pages\//, '').replace(/\.vue$/, ''))
  else if (/^components\//.test(relNorm)) tagName = basename(relNorm, '.vue').toLowerCase()
  if (tagName && HTML_RESERVED.has(tagName)) add(1, 'E_RESERVED_TAG', `File name '${basename(relNorm)}' conflicts with the HTML reserved tag '${tagName}'.`)

  // 런타임 근거(package/src/vue-zero.ts beforeEach): loginPage 가 보호 상태일 때만 E_LOGIN_PAGE_PROTECTED(리다이렉트 루프).
  // 404 가 보호 상태여도 로그인으로 보낼 뿐 루프가 아니고, error.vue 는 가드를 거치지 않으므로 둘은 검사하지 않는다.
  if (ctx.authEnabled && (ctx.publicPages || []).includes(relNorm)) {
    if (!/\bauth\s*:\s*false\b/.test(lex(source).code)) {
      const d = source.search(/export\s+default/)
      add(d < 0 ? 1 : lineOf(source, d), 'E_LOGIN_PAGE_PROTECTED', `Auth is enabled but ${relNorm} (the loginPage) has no \`auth: false\`.`)
    }
  }
  return out
}

export function loadContext(appDir) {
  const ctx = { authEnabled: false, publicPages: [], manifestEnabled: false }
  const idx = join(appDir, 'index.html')
  if (existsSync(idx)) {
    const html = readFileSync(idx, 'utf-8').replace(/<!--[\s\S]*?-->/g, '')
    // 인라인 <script> 만 모아 주석·문자열을 구분해 읽는다 (HTML 본문의 따옴표/URL 에 흔들리지 않게)
    const js = [...html.matchAll(/<script\b(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi)].map(x => x[1]).join('\n')
    const code = lex(js).code
    ctx.authEnabled = /\bauth\s*:\s*\{[^}]*\benabled\s*:\s*true\b/.test(code)
    ctx.manifestEnabled = /\bmanifest\s*:\s*(?:true\b|['"])/.test(code)
    const lp = code.match(/\bloginPage\s*:\s*['"]([^'"]*)['"]/)
    ctx.publicPages = loginPageFiles(lp ? lp[1] : '/login') // 런타임 기본값 /login (AuthGuard)
  }
  return ctx
}

function walk(dir, results = []) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) { if (e !== 'node_modules') walk(full, results) }
    else if (extname(e) === '.vue') results.push(full)
  }
  return results
}

export function composablesIssues(appDir) {
  const out = []
  const walkDirs = (dir) => {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e)
      if (!statSync(full).isDirectory() || e === 'node_modules') continue
      if (e === 'composables') out.push({ file: relative(process.cwd(), full) || full, line: 1, code: 'E_COMPOSABLES_DIR', level: 'error', message: 'A composables/ directory exists.', hint: HINTS.E_COMPOSABLES_DIR })
      walkDirs(full)
    }
  }
  if (existsSync(appDir)) walkDirs(appDir)
  return out
}

export function format(issues) {
  return issues.map(i => `${i.file}:${i.line} ${i.code}${i.level === 'warn' ? ' (warn)' : ''} ${i.message}\n  hint: ${i.hint}`).join('\n')
}

export function run(args, appDir = 'app') {
  const ctx = loadContext(appDir)
  const files = []
  let project = false
  if (args.length === 0) args = [appDir]
  for (const a of args) {
    if (!existsSync(a)) continue
    if (statSync(a).isDirectory()) { walk(a, files); project = true } else if (a.endsWith('.vue')) files.push(a)
  }
  const issues = []
  for (const f of files) {
    const rel = relative(appDir, f)
    issues.push(...checkSource(relative(process.cwd(), f) || f, readFileSync(f, 'utf-8'), ctx, rel))
  }
  if (project) {
    issues.push(...composablesIssues(appDir))
    issues.push(...manifestIssues(appDir, ctx.manifestEnabled)) // E_MANIFEST_STALE (doctor/scan --check 전용 코드)
  }
  return issues
}

// 종료 코드: 0 = 문제 없음/경고만, 3 = 위반(error 레벨 있음), 70 = doctor 내부 오류(위반 아님).
// (Node 의 미처리 예외는 1 이므로 위반과 구분되도록 위반을 3 으로 둔다.)
export const EXIT_VIOLATION = 3
export const EXIT_INTERNAL = 70

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const issues = run(process.argv.slice(2))
    if (issues.length) {
      const hasError = issues.some(i => i.level === 'error')
      ;(hasError ? process.stderr : process.stdout).write(format(issues) + '\n')
      process.exit(hasError ? EXIT_VIOLATION : 0)
    }
  } catch (e) {
    process.stderr.write(`doctor internal error: ${e && e.stack || e}\n`)
    process.exit(EXIT_INTERNAL)
  }
}
