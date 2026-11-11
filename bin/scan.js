#!/usr/bin/env node

import { readdirSync, statSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join, relative, basename, extname } from 'path'
import { createHash } from 'crypto'

const targets = process.argv.slice(2)
if (targets.length === 0) targets.push('app', 'server')

const scanApp = targets.includes('app')
const scanServer = targets.includes('server')

function scanVueFiles(dir) {
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

function syncJson(dir, jsonFile, toName) {
  if (!existsSync(dir)) return

  const files = scanVueFiles(dir)
  const names = files
    .map(f => toName(relative(dir, f)))
    .filter(Boolean)
    .sort()

  const jsonPath = join(dir, jsonFile)
  const prev = existsSync(jsonPath) ? readFileSync(jsonPath, 'utf-8').trim() : '[]'
  const next = JSON.stringify(names)

  if (prev === next) {
    console.log(`  ${jsonFile} — no changes`)
    return
  }

  writeFileSync(jsonPath, next + '\n')

  // diff
  const prevSet = new Set(JSON.parse(prev))
  const nextSet = new Set(names)
  for (const n of names) if (!prevSet.has(n)) console.log(`  + ${n}`)
  for (const n of prevSet) if (!nextSet.has(n)) console.log(`  - ${n}`)
}

// ── vz-manifest.json (형식 v1) ─────────────────────────────────────────────
// 명세: vue-zero README "Manifest (vz-manifest.json)". 라이브러리는 이 파일을 힌트로만 쓴다(없거나 틀려도 동작은 같다).
// 해시 = .vue 내용(CRLF 는 LF 로 정규화한 UTF-8)의 sha256 앞 10자. 키는 app/ 기준 POSIX 상대 경로.
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')
const pageName = (rel) => {
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

function buildManifest(appDir) {
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

function syncManifest(appDir) {
  const next = JSON.stringify(buildManifest(appDir)) + '\n'
  const path = join(appDir, 'vz-manifest.json')
  const prev = existsSync(path) ? readFileSync(path, 'utf-8') : ''
  if (prev === next) {
    console.log('  vz-manifest.json — no changes')
    return
  }
  writeFileSync(path, next)
  console.log('  vz-manifest.json — updated')
}

// app: pages + components
if (scanApp) {
  if (existsSync('app/pages')) {
    console.log('[vue-zero] scanning app/pages')
    syncJson('app/pages', 'pages.json', rel => {
      return pageName(rel.replace(/\\/g, '/'))
    })
  }

  if (existsSync('app/components')) {
    console.log('[vue-zero] scanning app/components')
    syncJson('app/components', 'components.json', rel => {
      return basename(rel, '.vue')
    })
  }

  if (existsSync('app/pages')) syncManifest('app')
}

// server: api routes → _registry.js
if (scanServer) {
  const routesDir = 'server/api'

  function scanJsFiles(dir, prefix = '') {
    const results = []
    if (!existsSync(dir)) return results

    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        results.push(...scanJsFiles(full, prefix + entry + '/'))
      } else if (extname(entry) === '.js') {
        results.push(prefix + basename(entry, '.js'))
      }
    }
    return results
  }

  if (existsSync(routesDir)) {
    console.log('[vue-zero] scanning server/api')
    const names = scanJsFiles(routesDir)
    const imports = names.map((n, i) => `import r${i} from './api/${n}.js'`).join('\n')
    const mounts = names.map((n, i) => `  app.route('/api/${n}', r${i})`).join('\n')
    const next = `// AUTO-GENERATED by vue-zero scan — do not edit\n${imports}\n\nexport default function register(app) {\n${mounts}\n}\n`

    const registryPath = 'server/_registry.js'
    const prev = existsSync(registryPath) ? readFileSync(registryPath, 'utf-8') : ''

    if (prev === next) {
      console.log('  _registry.js — no changes')
    } else {
      writeFileSync(registryPath, next)
      const prevNames = new Set([...prev.matchAll(/app\.route\('\/api\/(.+?)'/g)].map(m => m[1]))
      for (const n of names) if (!prevNames.has(n)) console.log(`  + /api/${n}`)
      for (const n of prevNames) if (!new Set(names).has(n)) console.log(`  - /api/${n}`)
    }
  }
}
