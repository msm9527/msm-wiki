const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const repoRoot = path.resolve(__dirname, '..')

const publicTextTargets = [
  'docs/zh',
  'docs/.vitepress/config.mts',
  'README.md',
  'DOCKER.md',
  'DOCKER_HUB_README.md',
  'Dockerfile.binary',
  '.github/ISSUE_TEMPLATE',
  '.github/docs',
  '.github/panabit/template/app.inf',
  '.github/workflows/daily-build-msm.yml',
  '.github/workflows/daily-build-msm-beta.yml'
]

function collectFiles(target) {
  const absolute = path.join(repoRoot, target)
  const stat = fs.statSync(absolute)

  if (stat.isFile()) return [absolute]

  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(absolute, entry.name)
    return entry.isDirectory()
      ? collectFiles(path.relative(repoRoot, child))
      : [child]
  })
}

test('public Wiki surfaces use Clash as the user-facing name', () => {
  const offenders = publicTextTargets
    .flatMap(collectFiles)
    .filter((file) => /Mihomo/.test(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(repoRoot, file))

  assert.deepEqual(offenders, [])
})

test('Clash guide states the management-only service boundary', () => {
  const guide = fs.readFileSync(
    path.join(repoRoot, 'docs/zh/guide/clash.md'),
    'utf8'
  )

  assert.match(guide, /::: warning 只提供管理能力/)
  assert.match(guide, /不提供节点、订阅、网络接入、内容分发或任何违法违规服务/)
})
