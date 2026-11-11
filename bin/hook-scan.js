#!/usr/bin/env node
// PostToolUse 훅: .vue 편집 → scan 실행 후 doctor 검사. 위반 시 exit 2 + stderr (Claude에게 피드백).
// scan 자체의 실패/출력은 편집을 막지 않는다.
import { spawnSync } from 'child_process'
import { existsSync } from 'fs'

let data = ''
process.stdin.on('data', (chunk) => data += chunk)
process.stdin.on('end', () => {
  let filePath = ''
  try { filePath = (JSON.parse(data).tool_input.file_path || '').replace(/\\/g, '/') } catch { process.exit(0) }

  const scan = (target) => spawnSync(process.execPath, ['bin/scan.js', target], { stdio: 'inherit' })

  if (filePath.endsWith('.vue')) {
    scan('app')
    if (!existsSync(filePath)) process.exit(0)
    const r = spawnSync(process.execPath, ['bin/doctor.js', filePath], { encoding: 'utf-8' })
    if (r.status === 1) {
      process.stderr.write(r.stderr + r.stdout)
      process.exit(2)
    }
    if (r.stdout) process.stdout.write(r.stdout) // 경고만 있는 경우
  } else if (filePath.includes('server/api/')) {
    scan('server')
  }
})
