// vz-manifest.json(형식 v1) 생성·검증 — scan.js 와 doctor.js 가 함께 쓴다. 의존성 없음.
import { readdirSync, statSync, readFileSync, existsSync } from 'fs'
import { join, relative, basename, extname } from 'path'
import { createHash } from 'crypto'

export function scanVueFiles(dir) {
  const results = []
  if (!existsSync(dir)) return results

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      results.push(...scanVueFiles(full))
    } else if (extname(entry) === '.vue') {
      results.push(full)
    }
  }
  return results
}

// ── vz-manifest.json (형식 v1) ─────────────────────────────────────────────
// 명세: vue-zero README "Manifest (vz-manifest.json)". 라이브러리는 이 파일을 힌트로만 쓴다(없거나 틀려도 동작은 같다).
// 해시 = .vue 내용(CRLF 는 LF 로 정규화한 UTF-8)의 sha256 앞 10자. 키는 app/ 기준 POSIX 상대 경로.
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')
export const pageName = (rel) => {
  const name = rel.replace(/\.vue$/, '')
  return (name === '404' || name === 'error') ? null : name
}

function templateOf(src) {
  const open = /<template(\s[^>]*)?>/.exec(src)
  if (!open) return ''
  const start = open.index + open[0].length
  const openTag = /<template(\s[^>]*)?>/gi
  const closeTag = /<\/template>/gi
  let depth = 1
  let i = start
  while (i < src.length) {
    openTag.lastIndex = i
    closeTag.lastIndex = i
    const o = openTag.exec(src)
    const c = closeTag.exec(src)
    const oIdx = o ? o.index : Infinity
    const cIdx = c ? c.index : Infinity
    if (cIdx === Infinity) break
    if (oIdx < cIdx) { depth++; i = oIdx + o[0].length } else {
      depth--
      if (depth === 0) return src.slice(start, cIdx).trim()
      i = cIdx + '</template>'.length
    }
  }
  return ''
}

function scriptOf(src) {
  const open = /<script(\s[^>]*)?>/.exec(src)
  if (!open) return ''
  const start = open.index + open[0].length
  const end = src.indexOf('</script>', start)
  return end === -1 ? '' : src.slice(start, end)
}

// 'default' | '<이름>' | false | undefined(판정 불가). 주석은 무시, layout 키가 2번 이상이거나 리터럴이 아니면 판정 불가
function layoutOf(script) {
  const code = script.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
  const keys = code.match(/\blayout\s*:/g)
  if (!keys) return 'default'
  if (keys.length > 1) return undefined
  const m = /\blayout\s*:\s*(?:(false)|'([^'\\\n]*)'|"([^"\\\n]*)")\s*(?=[,}\r\n])/.exec(code)
  if (!m) return undefined
  return m[1] ? false : (m[2] ?? m[3])
}

export function buildManifest(appDir) {
  const toPosix = p => p.replace(/\\/g, '/')
  const collect = sub => scanVueFiles(join(appDir, sub)).map(f => toPosix(relative(appDir, f))).sort()
  const pageFiles = collect('pages')
  const compFiles = collect('components')
  const layoutFiles = collect('layouts')

  const text = {}
  for (const rel of [...pageFiles, ...compFiles, ...layoutFiles]) {
    text[rel] = readFileSync(join(appDir, rel), 'utf-8').replace(/\r\n/g, '\n')
  }

  const pages = pageFiles.map(f => pageName(f.slice('pages/'.length))).filter(Boolean).sort()
  const components = compFiles.map(f => basename(f, '.vue')).sort()

  const files = {}
  for (const rel of Object.keys(text).sort()) files[rel] = sha256(text[rel]).slice(0, 10)

  // 라이브러리 ComponentLoader 와 같은 정규화(소문자, 하이픈 제거) — 중복 키는 정렬상 뒤의 이름이 이긴다
  const lookup = new Map()
  for (const n of components) lookup.set(n.replace(/-/g, '').toLowerCase(), n)
  const used = (template) => {
    const found = new Set()
    for (const m of template.matchAll(/<([A-Za-z][\w-]*)/g)) {
      const n = lookup.get(m[1].replace(/-/g, '').toLowerCase())
      if (n) found.add(n)
    }
    return [...found]
  }
  const closure = (templates) => {
    const seen = new Set()
    const queue = templates.flatMap(used)
    while (queue.length) {
      const n = queue.shift()
      if (seen.has(n)) continue
      seen.add(n)
      const src = text[`components/${n}.vue`]
      if (src !== undefined) queue.push(...used(templateOf(src)))
    }
    return [...seen].sort()
  }

  const deps = {}
  for (const rel of pageFiles) {
    if (rel === 'pages/error.vue') continue
    const layout = layoutOf(scriptOf(text[rel]))
    if (layout === undefined) continue
    const templates = [templateOf(text[rel])]
    if (layout !== false && text[`layouts/${layout}.vue`] !== undefined) templates.push(templateOf(text[`layouts/${layout}.vue`]))
    deps[rel] = { layout, components: closure(templates) }
  }
  const sortedDeps = {}
  for (const k of Object.keys(deps).sort()) sortedDeps[k] = deps[k]

  return {
    v: 1,
    build: sha256(JSON.stringify(files)),
    pages,
    components,
    has404: 'pages/404.vue' in text,
    hasError: 'pages/error.vue' in text,
    files,
    deps: sortedDeps,
  }
}


const HINT_STALE = 'Run `npm run scan` (it regenerates vz-manifest.json), then deploy again. Deploying with `npm run deploy` does this automatically.'

// 디스크의 vz-manifest.json 이 실제 파일과 맞는지 검사한다. 읽기 전용.
// optIn: 앱이 manifest 옵션을 켰는지(index.html). 파일이 없을 때 옵트인 앱만 위반으로 본다.
export function manifestIssues(appDir, optIn = false) {
  const path = join(appDir, 'vz-manifest.json')
  const file = (relative(process.cwd(), path) || path).replace(/\\/g, '/')
  const issue = (message) => ({ file, line: 1, code: 'E_MANIFEST_STALE', level: 'error', message, hint: HINT_STALE })
  if (!existsSync(join(appDir, 'pages'))) return []
  if (!existsSync(path)) return optIn ? [issue('vz-manifest.json is missing, but index.html enables the `manifest` option.')] : []
  let prev
  try { prev = JSON.parse(readFileSync(path, 'utf-8')) } catch { return [issue('vz-manifest.json is not valid JSON.')] }
  const next = buildManifest(appDir)
  if (JSON.stringify(prev) === JSON.stringify(next)) return []
  const out = []
  const pf = (prev && prev.files) || {}
  for (const k of Object.keys(next.files)) {
    if (!(k in pf)) out.push(issue(`${k} is not in vz-manifest.json (file added).`))
    else if (pf[k] !== next.files[k]) out.push(issue(`${k} changed since vz-manifest.json was generated (manifest ${pf[k]}, actual ${next.files[k]}).`))
  }
  for (const k of Object.keys(pf)) if (!(k in next.files)) out.push(issue(`${k} is in vz-manifest.json but the file no longer exists (file removed).`))
  if (!out.length) out.push(issue('vz-manifest.json does not match the current app (page/component lists or deps differ).'))
  return out
}
