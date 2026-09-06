const fs = require('node:fs');

// Keep legacy headings readable: a new release must not lose previous categories.
const SECTION_DEFS = [
  { key: 'highlights', title: '🎉 本次亮点', match: /亮点|看点|本次重点|Highlights/iu },
  { key: 'major', title: '🎉 重磅功能', match: /重磅功能/iu },
  { key: 'added', title: '🆕 新增功能', match: /新增|Added/iu },
  { key: 'changed', title: '✨ 功能增强', match: /功能增强|体验优化|变更|Changed/iu },
  { key: 'performance', title: '⚡ 性能优化', match: /性能|Performance/iu },
  { key: 'fixed', title: '🐛 问题修复', match: /修复|Fixed/iu },
  { key: 'security', title: '🛡️ 安全加固', match: /安全|Security/iu },
  { key: 'deprecated', title: '⚠️ 兼容性变更', match: /兼容|废弃|破坏性|Deprecated|Breaking/iu },
  { key: 'notes', title: '📌 升级提醒', match: /升级提醒|注意事项|备注|Notes/iu },
];
const DATA_PATTERN = /<!-- msm-release-data:([A-Za-z0-9+/=]+) -->/u;

function emptySections() {
  return Object.fromEntries(SECTION_DEFS.map(({ key }) => [key, []]));
}

function detectSection(line) {
  const title = line.trim().replace(/^#{2,4}\s+/u, '').replace(/^:::\s+(?:tip|info|warning|danger)\s+/u, '');
  const order = ['highlights', 'deprecated', 'security', 'performance', 'major', 'added', 'changed', 'fixed', 'notes'];
  return order.find((key) => SECTION_DEFS.find((def) => def.key === key).match.test(title));
}

function parseSummary(summary) {
  const sections = emptySections();
  let activeKey = 'notes';
  let fence = null;
  for (const rawLine of String(summary ?? '').replace(/\r/gu, '').split('\n')) {
    const line = rawLine.trim();
    const fenceMatch = line.match(/^(\x60{3,}|~{3,})/u);
    const insideFence = fence !== null;
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
    }
    if (!insideFence && !fenceMatch && /^(?:#{2,4}\s|:::\s+(?:tip|info|warning|danger)\s)/u.test(line)) {
      activeKey = detectSection(line) || 'notes';
      continue;
    }
    if (!insideFence && !fenceMatch && (/^:::/u.test(line) || line === '---')) {
      activeKey = 'notes';
      continue;
    }
    if (!line) continue;
    const target = sections[activeKey];
    if (!insideFence && !fenceMatch && (/^[-*+]\s+/u.test(rawLine) || /^\d+[.)]\s+/u.test(rawLine))) {
      target.push('- ' + line.replace(/^(?:[-*+]|\d+[.)])\s+/u, ''));
    } else if (target.length && (/^\s+/u.test(rawLine) || insideFence || fenceMatch)) {
      target[target.length - 1] += '\n' + rawLine;
    } else {
      target.push('- ' + line);
    }
  }
  return sections;
}

function normalizePublicTerminology(value) {
  return String(value ?? '').replace(/\bmihomo\b/giu, 'Clash');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;').replace(/"/gu, '&quot;').replace(/'/gu, '&#39;');
}

function decodeHtml(value) {
  return String(value ?? '').replace(/&quot;/gu, '"').replace(/&#39;/gu, "'")
    .replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&amp;/gu, '&');
}

function safeMarkdown(value) {
  // Generated prose is data, never raw HTML or a Vue template expression.
  return String(value ?? '').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
    .replace(/\{/gu, '&#123;').replace(/\}/gu, '&#125;');
}

function inlineHtml(value) {
  return escapeHtml(value).replace(/\{/gu, '&#123;').replace(/\}/gu, '&#125;')
    .replace(/\*\*([^*\n]+)\*\*([：:])?/gu, (_match, label, colon) => '<strong>' + label + (colon || '') + '</strong>')
    .replace(/\x60([^\x60\n]+)\x60/gu, '<code>$1</code>');
}

function renderSummary(sections) {
  const blocks = [];
  if (sections.highlights.length) {
    blocks.push('### 🎉 本次亮点 {#release-highlights}', '', '<ol class="msm-release-highlights">');
    for (const [index, item] of sections.highlights.entries()) {
      blocks.push('  <li class="msm-release-highlight">',
        '    <span class="msm-release-highlight-index" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span>',
        '    <p>' + inlineHtml(item.replace(/^-\s+/u, '')) + '</p>', '  </li>');
    }
    blocks.push('</ol>', '');
  }
  const details = SECTION_DEFS.filter(({ key }) => key !== 'highlights' && sections[key].length);
  if (details.length) {
    blocks.push('### 📋 完整更新 {#release-details}', '', '<nav class="msm-release-summary-nav" aria-label="更新分类">');
    for (const { key, title } of details) {
      blocks.push('  <a href="#release-' + key + '">' + escapeHtml(title) + ' <span>' + sections[key].length + '</span></a>');
    }
    blocks.push('</nav>', '');
  }
  for (const { key, title } of details) {
    blocks.push('<section class="msm-release-section msm-release-section--' + key + '">', '',
      '### ' + title + ' {#release-' + key + '}', '', ...sections[key].map(safeMarkdown), '', '</section>', '');
  }
  return blocks.join('\n').trim();
}

function trimVersion(version, channel) {
  return channel === 'stable' ? version.replace(/^v/u, '') : version;
}

function extractLatestSection(section, channel) {
  const version = decodeHtml((section.match(/>\s*当前\s*(?:稳定|Beta)\s*版本：\x60([^\x60]+)\x60/u) ?? section.match(/data-version="([^"]+)"/u))?.[1]);
  const date = decodeHtml((section.match(/>\s*发布时间：([^\n]+)/u) ?? section.match(/data-release-date="([^"]+)"/u))?.[1]).trim();
  const releaseUrl = decodeHtml((section.match(/>\s*-\s*发布页：<([^>]+)>/u) ?? section.match(/data-release-url="([^"]+)"/u))?.[1]);
  let sections;
  const encoded = section.match(DATA_PATTERN)?.[1];
  if (section.includes('<!-- msm-release-data:') && !encoded) {
    throw new Error('发布日志归档数据无效，停止更新以保护历史内容');
  }
  if (encoded) {
    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    if (payload.schema !== 1 || !payload.sections || !SECTION_DEFS.every(({ key }) =>
      Array.isArray(payload.sections[key]) && payload.sections[key].every((item) => typeof item === 'string'))) {
      throw new Error('发布日志归档数据无效，停止更新以保护历史内容');
    }
    sections = payload.sections;
  } else {
    const summary = (section.match(/\n### 📋 本次更新\n\n([\s\S]*?)(?=\n::: details|$)/u) ??
      section.match(/>\s*-\s*下载方式：[^\n]+\n([\s\S]*?)(?=\n::: details|$)/u))?.[1]?.trim() || '';
    sections = parseSummary(summary);
  }
  return { version, normalizedVersion: trimVersion(version, channel), date, releaseUrl, sections };
}

function buildLatestBlock(options) {
  const sections = parseSummary(normalizePublicTerminology(options.aiSummary));
  if (!Object.values(sections).some((items) => items.length)) sections.notes.push('- 暂无更新说明');
  const releaseUrl = 'https://github.com/msm9527/msm-wiki/releases/tag/' + encodeURIComponent(options.version);
  const installUrl = options.channel === 'beta' ? '/zh/guide/releases-beta.html#一键安装' : '/zh/guide/install.html';
  const displayVersion = options.channel === 'beta' ? options.version : 'v' + options.baseVersion;
  const count = SECTION_DEFS.filter(({ key }) => !['highlights', 'notes'].includes(key)).reduce((sum, { key }) => sum + sections[key].length, 0);
  const data = Buffer.from(JSON.stringify({ schema: 1, sections })).toString('base64');

  return [
    '<div class="msm-release-hero msm-release-hero--' + escapeHtml(options.channel) + '" data-version="' + escapeHtml(options.version) + '" data-release-date="' + escapeHtml(options.commitDate) + '" data-release-url="' + escapeHtml(releaseUrl) + '">',
    '  <div class="msm-release-hero-copy">',
    '    <h3 class="msm-release-version"><span>' + escapeHtml(options.channelName) + '</span> <code>' + escapeHtml(displayVersion) + '</code></h3>',
    '  </div>',
    '  <div class="msm-release-actions">',
    '    <a class="msm-release-action msm-release-action--primary" href="' + escapeHtml(releaseUrl) + '" target="_blank" rel="noreferrer">下载此版本 <span aria-hidden="true">↗</span></a>',
    '    <a class="msm-release-action" href="' + installUrl + '">安装指南 <span aria-hidden="true">→</span></a>',
    '  </div>', '</div>',
    '<div class="msm-release-metrics" aria-label="发布概览">',
    '  <div class="msm-release-metric"><span>更新</span><strong>' + count + ' 项</strong></div>',
    '  <div class="msm-release-metric"><span>亮点</span><strong>' + sections.highlights.length + ' 条</strong></div>',
    '  <div class="msm-release-metric"><span>源码提交日期</span><strong>' + escapeHtml(options.commitDate) + '</strong></div>',
    '</div>', '',
    '<!-- msm-release-data:' + data + ' -->', '', renderSummary(sections), '',
    '::: details 📋 构建信息',
    '- **发布通道**：' + escapeHtml(options.channel) + '（' + escapeHtml(options.channelName) + '）',
    '- **源提交**： [\x60' + escapeHtml(options.commitSha) + '\x60](https://github.com/msm9527/msm/commit/' + escapeHtml(options.commitShaFull) + ')',
    '- **提交信息**：' + safeMarkdown(normalizePublicTerminology(options.commitMessage)),
    '- **提交作者**：' + safeMarkdown(options.commitAuthor),
    '- **提交时间**：' + escapeHtml(options.commitDate),
    '- **下载说明**：' + safeMarkdown(options.releaseDownloadNote), ':::', '', '---',
  ].join('\n');
}

function buildHistoryEntry(section, options) {
  const current = extractLatestSection(section, options.channel);
  if (!current.version || !current.date || !current.releaseUrl) return '';
  const label = (current.normalizedVersion || current.version) + ' · ' + current.date.replace(/\s+CST$/u, '').slice(0, 16) + ' · ' + options.channelName;
  const blocks = ['::: details ' + label, '',
    '<div class="msm-release-history-link"><a href="' + escapeHtml(current.releaseUrl) + '" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>', ''];
  for (const { key, title } of SECTION_DEFS) {
    if (current.sections[key].length) blocks.push('**' + title + '**', '', ...current.sections[key].map(safeMarkdown), '');
  }
  blocks.push(':::');
  return blocks.join('\n');
}

function splitHistoryBody(historyBody) {
  const firstEntryIndex = historyBody.search(/\n(?:### |::: details )/u);
  return firstEntryIndex === -1 ? { intro: historyBody.trim(), entries: '' } :
    { intro: historyBody.slice(0, firstEntryIndex).trim(), entries: historyBody.slice(firstEntryIndex + 1).trim() };
}

function renderReleasePage(content, options) {
  const latestIndex = content.indexOf(options.latestVersionMarker);
  const historyIndex = content.indexOf(options.historyVersionMarker);
  if (latestIndex === -1 || historyIndex === -1 || latestIndex >= historyIndex) throw new Error('未找到有效标记: ' + options.releasesPath);
  const latestBodyStart = latestIndex + options.latestVersionMarker.length;
  const historyBodyStart = historyIndex + options.historyVersionMarker.length;
  const nextH2 = content.indexOf('\n## ', historyBodyStart);
  const historySectionEnd = nextH2 === -1 ? content.length : nextH2;
  const currentLatest = content.slice(latestBodyStart, historyIndex).trim();
  const { intro, entries } = splitHistoryBody(content.slice(historyBodyStart, historySectionEnd));
  const currentMeta = extractLatestSection(currentLatest, options.channel);
  const sameVersion = currentMeta.normalizedVersion === trimVersion(options.version, options.channel);
  const historyEntry = sameVersion ? '' : buildHistoryEntry(currentLatest, options);
  const historyParts = [intro];
  if (historyEntry && !entries.includes(historyEntry.split('\n', 1)[0])) historyParts.push(historyEntry);
  if (entries) historyParts.push(entries);
  const nextContent = [content.slice(0, latestBodyStart).trimEnd(), '', buildLatestBlock(options), '',
    options.historyVersionMarker, '', historyParts.filter(Boolean).join('\n\n').trim(), content.slice(historySectionEnd)].join('\n');
  return nextContent.replace(/\n{3,}/gu, '\n\n');
}

function updateReleasePage(options) {
  const content = fs.readFileSync(options.releasesPath, 'utf8');
  fs.writeFileSync(options.releasesPath, renderReleasePage(content, options));
}

module.exports = updateReleasePage;
Object.assign(module.exports, { SECTION_DEFS, parseSummary, buildLatestBlock, extractLatestSection, renderReleasePage });
