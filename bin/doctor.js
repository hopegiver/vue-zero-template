#!/usr/bin/env node
// vue-zero doctor — .vue 정적 검사. 의존성 없음. 문제가 없으면 아무것도 출력하지 않는다.
// 오탐 위험이 큰 규칙(미등록 태그, 템플릿 표현식 파싱 등)은 의도적으로 넣지 않는다.
import { readdirSync, statSync, readFileSync, existsSync } from 'fs'
import { join, relative, basename, extname, sep } from 'path'
import { fileURLToPath } from 'url'

const HTML_TAGS = new Set(('a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code ' +
  'col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 ' +
  'head header hr html i iframe img input ins kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup ' +
  'option output p param picture pre progress q rp rt ruby s samp script section select slot small source span strong style sub ' +
  'summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr svg path').split(' '))

const HINTS = {
  E_SCRIPT_SETUP: '`<script>` + `export default { ... }` (Options API)를 사용하세요.',
  E_SCRIPT_TS: 'TypeScript는 지원되지 않습니다. `lang` 속성을 제거하고 일반 JS로 작성하세요.',
  W_STYLE_SCOPED: '`scoped`를 제거하고 클래스명으로 범위를 구분하세요.',
  E_RELATIVE_IMPORT: '.vue의 script는 Blob URL로 실행되어 import가 불가능합니다. 공유 로직은 assets/js/utils.js의 전역 함수로 두세요.',
  E_BARE_IMPORT: '.vue에서는 import/export-from을 쓸 수 없습니다. 라이브러리는 index.html의 <script>로 로드하고 전역으로 사용하세요.',
  E_NO_EXPORT_DEFAULT: '`export default { ... }` 로 컴포넌트 객체를 내보내세요.',
  E_COMPOSABLES_DIR: 'composables/ 폴더는 쓸 수 없습니다. 함수는 assets/js/utils.js에 추가하세요.',
  E_RESERVED_TAG: 'HTML 표준 태그와 같은 이름은 컴포넌트로 쓸 수 없습니다. AppButton처럼 접두사를 붙여 파일명을 바꾸세요.',
  E_LOGIN_PAGE_PROTECTED: "auth 활성 상태에서 이 페이지에 `auth: false`가 없으면 미인증 사용자가 접근/리다이렉트 루프에 빠집니다. `export default { auth: false, ... }` 를 추가하세요.",
}

// 주석을 같은 길이의 공백(개행 유지)으로 치환 — 라인 번호 보존
function blank(s) {
  return s.replace(/\/\*[\s\S]*?\*\/|(^|[^:'"`\\])\/\/[^\n]*/g, (m, p) =>
    (p || '') + (m.slice((p || '').length)).replace(/[^\n]/g, ' '))
}

function lineOf(text, index) {
  let n = 1
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++
  return n
}

// ctx: { authEnabled: bool, publicPages: string[] } / rel: app 기준 상대경로(예: pages/login.vue)
export function checkSource(file, source, ctx = {}, rel = file) {
  const out = []
  const add = (line, code, message) => out.push({ file, line, code, message, hint: HINTS[code] })
  const relNorm = rel.split(sep).join('/')

  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  let m, hasScript = false, hasDefault = false
  while ((m = scriptRe.exec(source))) {
    hasScript = true
    const attrs = m[1]
    const line = lineOf(source, m.index)
    if (/(^|\s)setup(\s|=|$)/i.test(attrs)) add(line, 'E_SCRIPT_SETUP', '`<script setup>`은 지원되지 않습니다.')
    if (/\blang\s*=\s*["']?(ts|tsx)\b/i.test(attrs)) add(line, 'E_SCRIPT_TS', 'TypeScript(`lang="ts"`)는 지원되지 않습니다.')
    const bodyStart = m.index + m[0].indexOf('>') + 1
    const code = blank(m[2])
    const importRe = /^[ \t]*import\s*(?:[\w$*{][^'";]*?\bfrom\s*)?(['"])([^'"\n]+)\1/gm
    let im
    while ((im = importRe.exec(code))) {
      const rel2 = /^[./]/.test(im[2])
      add(lineOf(source, bodyStart + im.index + im[0].search(/\S/)), rel2 ? 'E_RELATIVE_IMPORT' : 'E_BARE_IMPORT',
        `import '${im[2]}' 는 .vue에서 사용할 수 없습니다.`)
    }
    const reexpRe = /^[ \t]*export\s*(?:\*|\{[^}]*\})\s*from\s*(['"])([^'"\n]+)\1/gm
    while ((im = reexpRe.exec(code))) {
      add(lineOf(source, bodyStart + im.index + im[0].search(/\S/)), /^[./]/.test(im[2]) ? 'E_RELATIVE_IMPORT' : 'E_BARE_IMPORT',
        `export ... from '${im[2]}' 는 .vue에서 사용할 수 없습니다.`)
    }
    if (/^[ \t]*export\s+default\b/m.test(code)) hasDefault = true
  }
  if (hasScript && !hasDefault) add(1, 'E_NO_EXPORT_DEFAULT', '<script>에 `export default`가 없습니다.')

  const styleRe = /<style\b[^>]*\bscoped\b[^>]*>/gi
  while ((m = styleRe.exec(source))) add(lineOf(source, m.index), 'W_STYLE_SCOPED', '`<style scoped>`는 사용하지 않습니다.')

  if (/^components\//.test(relNorm)) {
    const base = basename(relNorm, '.vue').toLowerCase()
    if (HTML_TAGS.has(base)) add(1, 'E_RESERVED_TAG', `파일명 '${basename(relNorm)}'이(가) HTML 표준 태그 '${base}'와 충돌합니다.`)
  }

  if (ctx.authEnabled && (ctx.publicPages || []).includes(relNorm)) {
    if (!/\bauth\s*:\s*false\b/.test(blank(source))) {
      const d = source.search(/export\s+default/)
      add(d < 0 ? 1 : lineOf(source, d), 'E_LOGIN_PAGE_PROTECTED', `auth가 활성인데 ${relNorm}에 \`auth: false\`가 없습니다.`)
    }
  }
  return out
}

export function loadContext(appDir) {
  const ctx = { authEnabled: false, publicPages: ['pages/404.vue', 'pages/error.vue'] }
  const idx = join(appDir, 'index.html')
  if (existsSync(idx)) {
    const html = readFileSync(idx, 'utf-8').replace(/<!--[\s\S]*?-->/g, '')
    ctx.authEnabled = /\bauth\s*:\s*\{[^}]*\benabled\s*:\s*true\b/.test(blank(html))
    const lp = html.match(/\bloginPage\s*:\s*['"]([^'"]+)['"]/)
    if (lp) ctx.publicPages.push('pages/' + lp[1].replace(/^\/+/, '') + '.vue')
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
      if (e === 'composables') out.push({ file: relative(process.cwd(), full) || full, line: 1, code: 'E_COMPOSABLES_DIR', message: 'composables/ 디렉터리가 존재합니다.', hint: HINTS.E_COMPOSABLES_DIR })
      walkDirs(full)
    }
  }
  if (existsSync(appDir)) walkDirs(appDir)
  return out
}

export function format(issues) {
  return issues.map(i => `${i.file}:${i.line} ${i.code} ${i.message}\n  hint: ${i.hint}`).join('\n')
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
  if (project) issues.push(...composablesIssues(appDir))
  return issues
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const issues = run(process.argv.slice(2))
  if (issues.length) {
    const text = format(issues) + '\n'
    const hasError = issues.some(i => i.code.startsWith('E_'))
    ;(hasError ? process.stderr : process.stdout).write(text)
    process.exit(hasError ? 1 : 0)
  }
}
