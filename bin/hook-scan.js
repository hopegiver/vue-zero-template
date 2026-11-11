#!/usr/bin/env node
// PostToolUse 훅: .vue 편집 → scan 실행 후 doctor 검사.
// doctor 종료 코드: 0 = 문제 없음/경고만, 3 = 위반. 위반·경고 출력은 stderr + exit 2 로 Claude 에게 피드백한다
// (PostToolUse exit 2 는 편집을 되돌리지 않고 피드백만 준다. exit 0 의 stdout 은 Claude 에게 전달되지 않는다).
// 그 밖의 종료(doctor 예외·시그널)는 위반이 아니므로 편집을 막지 않고 exit 0 + 1줄 안내만 남긴다.
// scan 자체의 실패/출력도 편집을 막지 않는다.
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
    if (r.status === 3 || (r.status === 0 && (r.stdout || r.stderr))) {
      process.stderr.write(r.stderr + r.stdout) // 위반 또는 경고
      process.exit(2)
    }
    if (r.status !== 0) {
      process.stdout.write(`[vue-zero] doctor failed internally (exit ${r.status}); skipped. Run \`npm run doctor\` to see details.\n`)
      process.exit(0)
    }
  } else if (filePath.includes('server/api/')) {
    scan('server')
  }
})
