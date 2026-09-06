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

function assertCompactBlock(block, options, updateCount, highlightCount) {
  const [overview, summary] = block.split('### 🎉 本次亮点 {#release-highlights}')
  assert.ok(summary, 'the highlights anchor is preserved')
  const [visible, buildInfo] = block.split('::: details 📋 构建信息')
  assert.ok(buildInfo, 'build information remains collapsible')
  assert.doesNotMatch(block, /msm-release-(?:kicker|lede|download-note)|<article\b/u)
  assert.doesNotMatch(overview, /<p>|<strong>[^<]+：<\/strong>/u)
  assert.equal(overview.match(/class="msm-release-metric"/gu)?.length, 3)
  assert.ok(overview.includes(`<span>更新</span><strong>${updateCount} 项</strong>`))
  assert.ok(overview.includes(`<span>亮点</span><strong>${highlightCount} 条</strong>`))
  assert.ok(overview.includes(`<span>源码提交日期</span><strong>${options.commitDate}</strong>`))
  assert.doesNotMatch(visible, /https:\/\/github\.com\/msm9527\/msm\/commit\//u)
  assert.ok(!visible.includes(options.releaseDownloadNote))
  assert.ok(buildInfo.includes(`- **下载说明**：${options.releaseDownloadNote}`))
  assert.ok(buildInfo.includes(`- **源提交**： [\`${options.commitSha}\`](https://github.com/msm9527/msm/commit/${options.commitShaFull})`))
  assert.equal(block.split(options.releaseDownloadNote).length - 1, 1)

  const highlights = summary.match(/<ol class="msm-release-highlights">([\s\S]*?)<\/ol>/u)?.[1]
  assert.ok(highlights, 'highlights use an ordered list')
  const items = [...highlights.matchAll(/<li class="msm-release-highlight">\s*<span class="msm-release-highlight-index" aria-hidden="true">(\d+)<\/span>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/gu)]
  assert.equal(items.length, highlightCount)
  for (const [index, item] of items.entries()) {
    assert.equal(item[1], String(index + 1).padStart(2, '0'))
    assert.doesNotMatch(item[2], /<\/?(?:p|div|br)\b/u)
    assert.equal(block.split(item[2]).length - 1, 1, 'each highlight appears only once')
  }
  const positions = [
    'class="msm-release-hero ', 'class="msm-release-metrics"',
    '{#release-highlights}', '{#release-details}', 'class="msm-release-summary-nav"',
    'class="msm-release-section ', '::: details 📋 构建信息',
  ].map((marker) => block.indexOf(marker))
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])))
  const sections = updateReleasePage.parseSummary(options.aiSummary)
  for (const { key, title } of updateReleasePage.SECTION_DEFS) {
    if (key === 'highlights' || !sections[key].length) continue
    assert.ok(block.includes(`<a href="#release-${key}">${title} <span>${sections[key].length}</span></a>`))
    assert.ok(block.includes(`### ${title} {#release-${key}}\n\n${sections[key].join('\n')}`), `${key} retains its full title and body`)
  }
}

test('release pages render a compact overview and collapsible history', () => {
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
  assert.doesNotMatch(output, /msm-release-kicker|msm-release-lede/u)
  assert.match(output, /### 📋 完整更新/u)
  assert.match(output, /<ol class="msm-release-highlights">/u)
  assert.match(output, /<li class="msm-release-highlight">/u)
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
  assert.doesNotMatch(output, /::: details (?:v)?1\.2\.6 ·/u)
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
    `### ${title}\n- **${key} 标题**：支持 \`Clash\` / Sing-Box\n  - ${key} 子项\n    - ${key} 孙项\n\n  ${key} 续行\n\n  \`\`\`text\n  ### 保留代码中的标题\n  - ${key} 代码\n  \`\`\``,
  ).join('\n\n')
  updateReleasePage(makeOptions(releasesPath, '1.2.6', summary))
  const first = fs.readFileSync(releasesPath, 'utf8')
  const extracted = updateReleasePage.extractLatestSection(first, 'stable')
  assert.deepEqual(extracted, {
    version: '1.2.6',
    normalizedVersion: '1.2.6',
    date: '2026-09-06 12:00:00 CST',
    releaseUrl: 'https://github.com/msm9527/msm-wiki/releases/tag/1.2.6',
    sections: updateReleasePage.parseSummary(summary),
  })
  for (const { key } of updateReleasePage.SECTION_DEFS) {
    assert.deepEqual(extracted.sections[key], [
      `- **${key} 标题**：支持 \`Clash\` / Sing-Box\n  - ${key} 子项\n    - ${key} 孙项\n  ${key} 续行\n  \`\`\`text\n  ### 保留代码中的标题\n  - ${key} 代码\n  \`\`\``,
    ])
  }
  const encoded = first.match(/<!-- msm-release-data:([A-Za-z0-9+/=]+) -->/u)[1]
  assert.deepEqual(JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')), {
    schema: 1, sections: extracted.sections,
  })
  assert.match(first, /<strong>highlights 标题：<\/strong>支持 <code>Clash<\/code> \/ Sing-Box/u)
  assert.match(first, /<strong>7 项<\/strong>/u)
  assert.doesNotMatch(first, /::: danger/u)
  updateReleasePage(makeOptions(releasesPath, '1.2.7', '### 📌 升级提醒\n- 无新增功能'))
  const archived = fs.readFileSync(releasesPath, 'utf8')
  for (const { key, title } of updateReleasePage.SECTION_DEFS) {
    assert.ok(archived.includes(`**${title}**\n\n- **${key} 标题**`))
    assert.ok(archived.includes(`  - ${key} 子项`))
    assert.ok(archived.includes(extracted.sections[key][0]))
  }
})

test('source dates are not presented as publish dates and generated prose cannot execute templates', () => {
  const block = updateReleasePage.buildLatestBlock(makeOptions('', '1.2.6',
    '### 🎉 本次亮点\n- **清晰标题**：<img onerror="bad()"> {{ bad() }}\n\n### 🐛 问题修复\n- <script>bad()</script>'))
  assert.match(block, /源码提交日期/u)
  assert.doesNotMatch(block, /发布时间/u)
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
  const options = makeBetaOptions('', 'beta-1.4.1', summary)
  const block = updateReleasePage.buildLatestBlock(options)
  assert.deepEqual(updateReleasePage.extractLatestSection(block, 'beta').sections, sections)
  assertCompactBlock(block, options, 20, 5)
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
  const options = makeOptions('', '1.2.6', summary)
  const block = updateReleasePage.buildLatestBlock(options)
  assert.deepEqual(updateReleasePage.extractLatestSection(block, 'stable').sections, sections)
  assertCompactBlock(block, options, 4, 3)
})

for (const { channel, version, previousVersion } of [
  { channel: 'stable', version: '1.2.6', previousVersion: '1.2.6' },
  { channel: 'stable', version: '1.2.6', previousVersion: 'v1.2.6' },
  { channel: 'beta', version: 'beta-1.4.1', previousVersion: 'beta-1.4.1' },
]) {
  test(`${previousVersion} article template migrates without adding same-version history`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-release-migration-'))
    t.after(() => fs.rmSync(root, { recursive: true, force: true }))
    const releasesPath = path.join(root, 'releases.md')
    const summary = fs.readFileSync(path.join(__dirname, `fixtures/release-${channel}-${version.replace(/^beta-/u, '')}.md`), 'utf8')
    const options = (channel === 'beta' ? makeBetaOptions : makeOptions)(releasesPath, version, summary)
    const compact = updateReleasePage.buildLatestBlock(options)
    const oldCards = compact
      .replace(`data-version="${version}"`, `data-version="${previousVersion}"`)
      .replace('<ol class="msm-release-highlights">', '<div class="msm-release-highlights">')
      .replace(/<li class="msm-release-highlight">/gu, '<article class="msm-release-highlight">')
      .replace(/<\/li>/gu, '</article>')
      .replace('</ol>', '</div>')
    const intro = `# 发布\n\n<nav aria-label="发布通道">通道导航</nav>\n\n${options.latestVersionMarker}\n\n`
    const tail = `${options.historyVersionMarker}\n\n> 旧版本记录\n\n::: details 历史版本\n\n**旧分类**\n\n- 历史正文\n  - 历史子项\n:::\n\n## 一键安装\n\n安装说明与原有链接\n`
    fs.writeFileSync(releasesPath, intro + oldCards + '\n\n' + tail)

    updateReleasePage(options)
    const first = fs.readFileSync(releasesPath, 'utf8')
    assert.equal(first, intro + compact + '\n\n' + tail)
    assert.deepEqual(updateReleasePage.extractLatestSection(first, channel), {
      version,
      normalizedVersion: version,
      date: options.commitDate,
      releaseUrl: `https://github.com/msm9527/msm-wiki/releases/tag/${version}`,
      sections: updateReleasePage.parseSummary(summary),
    })
    assert.equal(first.match(/<!-- msm-release-data:[^\n]+/u)[0], oldCards.match(/<!-- msm-release-data:[^\n]+/u)[0])

    updateReleasePage(options)
    assert.equal(fs.readFileSync(releasesPath, 'utf8'), first, 'same-version regeneration is byte-for-byte idempotent')
  })
}

test('a release without highlights keeps compact stats and download instructions in build information', () => {
  const options = makeOptions('', '1.2.6', '### 📌 升级提醒\n- 请备份配置')
  options.releaseDownloadNote = '下载说明 <img onerror="bad()"> {{ bad() }}'
  const block = updateReleasePage.buildLatestBlock(options)
  const [visible, buildInfo] = block.split('::: details 📋 构建信息')
  assert.doesNotMatch(visible, /msm-release-kicker|msm-release-lede|msm-release-highlights|下载说明/u)
  assert.match(visible, /<span>更新<\/span><strong>0 项<\/strong>/u)
  assert.match(visible, /<span>亮点<\/span><strong>0 条<\/strong>/u)
  assert.match(visible, /请备份配置/u)
  assert.match(buildInfo, /\*\*下载说明\*\*：下载说明 &lt;img/u)
  assert.doesNotMatch(block, /<img|\{\{ bad/u)
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
