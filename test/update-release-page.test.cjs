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
      '### ⭐ 本次亮点（Highlights）\n- 新版本入口更醒目\n\n### ✨ 新增（Added）\n- 新的版本概览\n\n### 🐛 修复（Fixed）\n- 修复发布页布局',
    ),
  )

  let output = fs.readFileSync(releasesPath, 'utf8')
  assert.match(output, /class="msm-release-hero[^\n]+data-version="1\.2\.6"/u)
  assert.match(output, /href="\/zh\/guide\/install\.html"/u)
  assert.match(output, /msm-release-lede-label.*本次亮点/u)
  assert.match(output, /### 📋 完整更新/u)
  assert.match(output, /class="msm-release-highlight"/u)
  assert.match(output, /### 🆕 新增功能/u)
  assert.match(output, /### 🐛 问题修复/u)
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

test('legacy custom blocks retain categories when archived into the next release', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-release-roundtrip-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const releasesPath = path.join(root, 'releases.md')
  fs.writeFileSync(releasesPath, `# 发布\n\n## 🚀 最新稳定版本\n
<div data-version="1.2.6" data-release-date="2026-09-06 12:00:00 CST" data-release-url="https://example.com/1.2.6"></div>

### 📋 本次更新

::: warning ⭐ 本次亮点（Highlights）
- 旧亮点
:::

::: tip ✨ 新增（Added）
- 旧功能
:::

::: danger 🐛 修复（Fixed）
- 旧修复
:::

::: details 📋 构建信息
- 元数据
:::

## 📚 历史版本

## 一键安装

安装内容不应丢失
`)
  updateReleasePage(makeOptions(releasesPath, '1.2.7', '### ✨ 功能增强\n- 新增强'))
  const result = fs.readFileSync(releasesPath, 'utf8')
  assert.match(result, /\*\*🎉 本次亮点\*\*\n\n- 旧亮点/u)
  assert.match(result, /\*\*🆕 新增功能\*\*\n\n- 旧功能/u)
  assert.match(result, /\*\*🐛 问题修复\*\*\n\n- 旧修复/u)
  assert.doesNotMatch(result, /- 元数据/u)
  assert.match(result, /## 一键安装\n\n安装内容不应丢失/u)
})

test('structured roundtrip preserves all categories, nested items and formatted highlights', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-release-data-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const releasesPath = path.join(root, 'releases.md')
  fs.writeFileSync(releasesPath, '# 发布\n\n## 🚀 最新稳定版本\n\n## 📚 历史版本\n')
  const summary = updateReleasePage.SECTION_DEFS.map(({ key, title }) =>
    `### ${title}\n- **${key} 标题**：支持 \`Clash\` / Sing-Box\n  - ${key} 子项`,
  ).join('\n\n')
  updateReleasePage(makeOptions(releasesPath, '1.2.6', summary))
  const first = fs.readFileSync(releasesPath, 'utf8')
  const extracted = updateReleasePage.extractLatestSection(first, 'stable')
  assert.deepEqual(extracted.sections, updateReleasePage.parseSummary(summary))
  assert.match(first, /<strong>highlights 标题：<\/strong>支持 <code>Clash<\/code> \/ Sing-Box/u)
  assert.match(first, /<strong>7 项<\/strong>/u)
  assert.doesNotMatch(first, /::: danger/u)
  updateReleasePage(makeOptions(releasesPath, '1.2.7', '### 📌 升级提醒\n- 无新增功能'))
  const archived = fs.readFileSync(releasesPath, 'utf8')
  for (const { key, title } of updateReleasePage.SECTION_DEFS) {
    assert.ok(archived.includes(`**${title}**\n\n- **${key} 标题**`))
    assert.ok(archived.includes(`  - ${key} 子项`))
  }
})

test('source dates are not presented as publish dates and generated prose cannot execute templates', () => {
  const block = updateReleasePage.buildLatestBlock(makeOptions('', '1.2.6',
    '### 🎉 本次亮点\n- **清晰标题**：<img onerror="bad()"> {{ bad() }}\n\n### 🐛 问题修复\n- <script>bad()</script>'))
  assert.match(block, /源码提交时间/u)
  assert.doesNotMatch(block, /<img|<script>|\{\{ bad/u)
  assert.match(block, /&lt;script&gt;/u)
})

test('the reviewed Beta 1.4.1 fixture retains every detail and upgrade notice', () => {
  const summary = fs.readFileSync(path.join(__dirname, 'fixtures/release-beta-1.4.1.md'), 'utf8')
  const sections = updateReleasePage.parseSummary(summary)
  assert.equal(sections.highlights.length, 5)
  assert.equal(sections.major.length, 1)
  assert.equal(sections.changed.length, 10)
  assert.equal(sections.fixed.length, 7)
  assert.equal(sections.security.length, 2)
  assert.equal(sections.notes.length, 3)
  const block = updateReleasePage.buildLatestBlock(makeBetaOptions('', 'beta-1.4.1', summary))
  assert.deepEqual(updateReleasePage.extractLatestSection(block, 'beta').sections, sections)
  assert.equal(block.match(/class="msm-release-highlight"/gu)?.length, 5)
  assert.match(block, /href="#release-major"/u)
  assert.match(block, /<strong>20 项<\/strong>/u)
  assert.match(block, /已加载事件/u)
  assert.match(block, /最多 50 条/u)
  assert.match(block, /单侧数据缺失时保留空位/u)
  assert.doesNotMatch(block, /全部历史|管理员.*下放|负百分比/u)
})

test('stable 1.2.6 does not re-advertise features already shipped in 1.2.5', () => {
  const summary = fs.readFileSync(path.join(__dirname, 'fixtures/release-stable-1.2.6.md'), 'utf8')
  const sections = updateReleasePage.parseSummary(summary)
  assert.equal(sections.highlights.length, 3)
  assert.equal(sections.major.length, 0)
  assert.equal(sections.added.length, 0)
  assert.equal(sections.performance.length, 1)
  assert.equal(sections.fixed.length, 3)
  assert.doesNotMatch(sections.highlights.join('\n'), /勋章|WebSocket|代理内联/u)
  assert.match(sections.notes.join('\n'), /未重复列为本版新增/u)
})

test('malformed archive data aborts without overwriting the page', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-release-invalid-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const releasesPath = path.join(root, 'releases.md')
  const source = '## 🚀 最新稳定版本\n<!-- msm-release-data:eyJzY2hlbWEiOjF9 -->\n## 📚 历史版本\n'
  fs.writeFileSync(releasesPath, source)
  assert.throws(() => updateReleasePage(makeOptions(releasesPath, '1.2.6', '- 新内容')), /归档数据无效/u)
  assert.equal(fs.readFileSync(releasesPath, 'utf8'), source)
  const invalidBase64 = source.replace('eyJzY2hlbWEiOjF9', '!corrupt!')
  fs.writeFileSync(releasesPath, invalidBase64)
  assert.throws(() => updateReleasePage(makeOptions(releasesPath, '1.2.6', '- 新内容')), /归档数据无效/u)
  assert.equal(fs.readFileSync(releasesPath, 'utf8'), invalidBase64)
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
      '### ⭐ 本次亮点（Highlights）\n- Beta 新功能更易发现\n\n### ✨ 新增（Added）\n- Beta 新功能',
    ),
  )

  const output = fs.readFileSync(releasesPath, 'utf8')
  assert.match(output, /msm-release-hero--beta/u)
  assert.match(output, /href="\/zh\/guide\/releases-beta\.html#一键安装"/u)
  assert.match(output, /::: details beta-1\.4\.0 · 2026-08-30 12:00 · Beta 版/u)

  fs.rmSync(root, { recursive: true, force: true })
})
