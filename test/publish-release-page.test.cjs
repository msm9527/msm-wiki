const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const { buildLatestBlock } = require('../scripts/update-release-page.cjs')
const { publishReleasePage } = require('../scripts/publish-release-page.cjs')

const root = path.resolve(__dirname, '..')
const betaOptions = {
  version: 'beta-1.4.2',
  baseVersion: '1.4.2',
  channel: 'beta',
  channelName: 'Beta 版',
  aiSummary: '### 🎉 本次亮点\n- **并发安全**：发布页面安全更新\n\n### 🐛 问题修复\n- 修复并发发布冲突',
  commitSha: 'abcdef1',
  commitShaFull: 'abcdef1234567890abcdef1234567890abcdef12',
  commitMessage: 'chore: test release',
  commitAuthor: 'test',
  commitDate: '2026-09-06 18:00:00 CST',
  releaseDownloadNote: '提供完整校验清单',
  latestVersionMarker: '## 🧪 最新 Beta 版本',
  historyVersionMarker: '## 📚 历史 Beta 版本',
  releasesPath: 'docs/zh/guide/releases-beta.md',
}

function pageFor(version = 'beta-1.4.1', suffix = '') {
  const previous = { ...betaOptions, version, baseVersion: version.replace(/^beta-/u, '') }
  return [
    '# Beta 发布', '', betaOptions.latestVersionMarker, '', buildLatestBlock(previous), '',
    betaOptions.historyVersionMarker, '', `> 手工历史${suffix}`, '',
    '::: details beta-1.3.9 · 手工归档', '', '- 保留历史内容', '', ':::', '',
    '## 一键安装', '', '安装说明仍然存在', '',
  ].join('\n')
}

function mockGithub(contents, putHandler = async () => ({ data: { commit: { sha: 'published-sha' } } })) {
  let reads = 0
  const writes = []
  return {
    reads: () => reads,
    writes,
    rest: { repos: {
      getContent: async () => {
        const content = typeof contents === 'function' ? contents(reads) : contents
        reads += 1
        return { data: { type: 'file', encoding: 'base64', content: Buffer.from(content).toString('base64'), sha: `file-sha-${reads}` } }
      },
      createOrUpdateFileContents: async (input) => {
        writes.push(input)
        return putHandler(input, writes.length)
      },
    } },
  }
}

test('publishes only the allowlisted channel file through the Contents API', async () => {
  const github = mockGithub(pageFor())
  const result = await publishReleasePage({ github, owner: 'msm9527', repo: 'msm-wiki', options: betaOptions })

  assert.equal(result.status, 'published')
  assert.equal(result.attempts, 1)
  assert.equal(github.writes.length, 1)
  assert.equal(github.writes[0].path, betaOptions.releasesPath)
  assert.equal(github.writes[0].branch, 'main')
  assert.equal(github.writes[0].sha, 'file-sha-1')
  assert.match(github.writes[0].message, /docs:.*update release notes beta-1\.4\.2/u)
  assert.match(Buffer.from(github.writes[0].content, 'base64').toString('utf8'), /beta-1\.4\.2/u)
})

test('re-reads and re-renders after a Contents API conflict, retaining concurrent edits', async () => {
  const concurrent = pageFor('beta-1.4.1', '（并发保留）')
  const github = mockGithub((read) => read === 0 ? pageFor() : concurrent, async () => {
    const error = new Error('conflict')
    error.status = 409
    if (github.writes.length === 1) throw error
    return { data: { commit: { sha: 'retry-sha' } } }
  })

  const result = await publishReleasePage({ github, owner: 'o', repo: 'r', options: betaOptions })
  const written = Buffer.from(github.writes[1].content, 'base64').toString('utf8')
  assert.deepEqual(result, { status: 'published', commitSha: 'retry-sha', attempts: 2 })
  assert.match(written, /并发保留/u)
  assert.match(written, /beta-1\.4\.2/u)
  assert.equal(github.reads(), 2)
})

test('does not retry permission failures, unchanged pages, or superseded versions', async () => {
  const forbiddenGithub = mockGithub(pageFor(), async () => {
    const error = new Error('forbidden')
    error.status = 403
    throw error
  })
  await assert.rejects(() => publishReleasePage({ github: forbiddenGithub, owner: 'o', repo: 'r', options: betaOptions }), /forbidden/u)
  assert.equal(forbiddenGithub.reads(), 1)
  assert.equal(forbiddenGithub.writes.length, 1)

  const unchangedGithub = mockGithub(pageFor('beta-1.4.2'))
  const unchanged = await publishReleasePage({ github: unchangedGithub, owner: 'o', repo: 'r', options: betaOptions })
  assert.equal(unchanged.status, 'unchanged')
  assert.equal(unchangedGithub.writes.length, 0)

  const newerGithub = mockGithub(pageFor('beta-1.4.3'))
  const newer = await publishReleasePage({ github: newerGithub, owner: 'o', repo: 'r', options: betaOptions })
  assert.equal(newer.status, 'superseded')
  assert.equal(newerGithub.writes.length, 0)
})

test('rejects cross-channel paths and exhausts only content-conflict retries', async () => {
  await assert.rejects(() => publishReleasePage({
    github: mockGithub(pageFor()), owner: 'o', repo: 'r', options: { ...betaOptions, releasesPath: 'docs/zh/guide/releases.md' },
  }), /Invalid release page target/u)

  const github = mockGithub(pageFor(), async () => {
    const error = new Error('conflict')
    error.status = 409
    throw error
  })
  await assert.rejects(() => publishReleasePage({ github, owner: 'o', repo: 'r', options: betaOptions, maxAttempts: 2 }), /retries exhausted/u)
  assert.equal(github.reads(), 2)
  assert.equal(github.writes.length, 2)
})

test('the production pages keep the expected allowlisted paths', () => {
  assert.match(fs.readFileSync(path.join(root, 'docs/zh/guide/releases.md'), 'utf8'), /## 🚀 最新稳定版本/u)
  assert.match(fs.readFileSync(path.join(root, 'docs/zh/guide/releases-beta.md'), 'utf8'), /## 🧪 最新 Beta 版本/u)
})
