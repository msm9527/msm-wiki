const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const updateReleasePage = require('../scripts/update-release-page.cjs')

function makeOptions(releasesPath, version, summary) {
  return {
    version,
    baseVersion: version.replace(/^v/u, ''),
    channel: 'stable',
    channelName: '稳定版',
    aiSummary: summary,
    commitSha: 'abc1234',
    commitShaFull: 'a'.repeat(40),
    commitMessage: 'feat: improve release page',
    commitAuthor: 'msm',
    commitDate: '2026-09-06 12:00:00 CST',
    releaseDownloadNote: '发布页提供多平台二进制、安装包与 SHA256 校验清单',
    latestVersionMarker: '## 🚀 最新稳定版本',
    historyVersionMarker: '## 📚 历史版本',
    releasesPath,
  }
}

function makeBetaOptions(releasesPath, version, summary) {
  return {
    ...makeOptions(releasesPath, version, summary),
    channel: 'beta',
    channelName: 'Beta 版',
    baseVersion: version.replace(/^beta-/u, ''),
    latestVersionMarker: '## 🧪 最新 Beta 版本',
    historyVersionMarker: '## 📚 历史 Beta 版本',
  }
}

test('release pages render a scan-friendly overview and collapsible history', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-release-page-'))
  const releasesPath = path.join(root, 'releases.md')
  const source = `# 📦 版本发布

## 🚀 最新稳定版本

> 当前稳定版本：\`v1.2.5\`  
> 发布时间：2026-08-01 12:00:00 CST  
> - 发布页：<https://github.com/msm9527/msm-wiki/releases/tag/1.2.5>  
> - 下载方式：旧下载说明

### ✨ 新增（Added）
- 旧版本功能

::: details 📋 构建信息
- **发布通道**: stable（稳定版）
:::

---

## 📚 历史版本

> 旧版本记录

## ⚠️ 使用说明
`
  fs.writeFileSync(releasesPath, source)

  updateReleasePage(
    makeOptions(
      releasesPath,
      '1.2.6',
      '### ✨ 新增（Added）\n- 新的版本概览\n\n### 🐛 修复（Fixed）\n- 修复发布页布局',
    ),
  )

  let output = fs.readFileSync(releasesPath, 'utf8')
  assert.match(output, /class="msm-release-hero[^\n]+data-version="1\.2\.6"/u)
  assert.match(output, /### 📋 本次更新/u)
  assert.match(output, /::: tip ✨ 新增（Added）/u)
  assert.match(output, /::: danger 🐛 修复（Fixed）/u)
  assert.match(output, /::: details 1\.2\.5 · 2026-08-01 12:00 · 稳定版/u)

  updateReleasePage(
    makeOptions(
      releasesPath,
      '1.2.6',
      '### ✨ 新增（Added）\n- 第二次生成',
    ),
  )
  output = fs.readFileSync(releasesPath, 'utf8')
  assert.equal(
    output.match(/::: details 1\.2\.5 · 2026-08-01 12:00 · 稳定版/gu)?.length,
    1,
  )

  fs.rmSync(root, { recursive: true, force: true })
})

test('beta release pages keep the beta install entry point and channel labels', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-beta-release-page-'))
  const releasesPath = path.join(root, 'releases-beta.md')
  const source = `# 🧪 Beta 版发布

## 🧪 最新 Beta 版本

> 当前 Beta 版本：\`beta-1.4.0\`  
> 发布时间：2026-08-30 12:00:00 CST  
> - 发布页：<https://github.com/msm9527/msm-wiki/releases/tag/beta-1.4.0>  
> - 下载方式：旧下载说明

### ✨ 新增（Added）
- 旧 Beta 功能

## 📚 历史 Beta 版本

> 旧 Beta 版本记录
`
  fs.writeFileSync(releasesPath, source)

  updateReleasePage(
    makeBetaOptions(
      releasesPath,
      'beta-1.4.1',
      '### ✨ 新增（Added）\n- Beta 新功能',
    ),
  )

  const output = fs.readFileSync(releasesPath, 'utf8')
  assert.match(output, /msm-release-hero--beta/u)
  assert.match(output, /href="\/zh\/guide\/releases-beta\.html#一键安装"/u)
  assert.match(output, /::: details beta-1\.4\.0 · 2026-08-30 12:00 · Beta 版/u)

  fs.rmSync(root, { recursive: true, force: true })
})
