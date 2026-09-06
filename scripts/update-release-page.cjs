const fs = require('fs');

const SECTION_DEFS = [
  {
    key: 'added',
    title: '✨ 新增（Added）',
    blockType: 'tip',
    patterns: [/^#{2,3}\s*✨\s*新增(?:（Added）)?\s*$/u],
  },
  {
    key: 'changed',
    title: '🔧 变更（Changed）',
    blockType: 'info',
    patterns: [/^#{2,3}\s*🔧\s*变更(?:（Changed）)?\s*$/u],
  },
  {
    key: 'fixed',
    title: '🐛 修复（Fixed）',
    blockType: 'danger',
    patterns: [/^#{2,3}\s*🐛\s*修复(?:（Fixed）)?\s*$/u],
  },
  {
    key: 'deprecated',
    title: '⚠️ 废弃（Deprecated）',
    blockType: 'warning',
    patterns: [
      /^#{2,3}\s*⚠️\s*废弃(?:（Deprecated）)?\s*$/u,
      /^#{2,3}\s*⚠️\s*备注(?:（Notes）)?\s*$/u,
    ],
  },
  {
    key: 'notes',
    title: '📝 备注（Notes）',
    blockType: 'info',
    patterns: [
      /^#{2,3}\s*📝\s*备注(?:（Notes）)?\s*$/u,
      /^#{2,3}\s*📝\s*备注\s*$/u,
    ],
  },
];

function detectSection(line) {
  const normalized = line.trim();
  const directSection = SECTION_DEFS.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(normalized)),
  )?.key;
  if (directSection) return directSection;

  const customBlockTitle = normalized.match(
    /^:::\s+(?:tip|info|warning|danger)\s+(.+)$/u,
  )?.[1];
  if (!customBlockTitle) return undefined;

  return SECTION_DEFS.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(customBlockTitle.trim())),
  )?.key;
}

function parseSummary(summary) {
  const sections = Object.fromEntries(
    SECTION_DEFS.map(({ key }) => [key, []]),
  );
  let activeKey = null;
  const looseNotes = [];

  for (const rawLine of summary.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim();
    if (!line || line === '---') continue;

    if (line === ':::') {
      activeKey = null;
      continue;
    }

    const sectionKey = detectSection(line);
    if (sectionKey) {
      activeKey = sectionKey;
      continue;
    }

    if (/^:::\s+(?:details|tip|info|warning|danger)\b/u.test(line)) {
      activeKey = null;
      continue;
    }

    const bullet = line.replace(/^[-*]\s+/, '').trim();
    if (!bullet) continue;

    const target = activeKey ? sections[activeKey] : looseNotes;
    target.push(`- ${bullet}`);
  }

  if (looseNotes.length > 0) {
    sections.notes.push(...looseNotes);
  }

  return sections;
}

function renderSummary(summary) {
  const sections = parseSummary(normalizePublicTerminology(summary));
  const rendered = SECTION_DEFS.flatMap(({ key, title, blockType }) => {
    if (sections[key].length === 0) return [];
    return [`::: ${blockType} ${title}`, ...sections[key], ':::', ''];
  });

  if (rendered.length === 0) {
    return ['::: info 📝 备注（Notes）', '- 暂无更新说明', ':::'].join('\n');
  }

  return rendered.join('\n').trim();
}

function normalizePublicTerminology(value) {
  return String(value ?? '').replace(/\bmihomo\b/giu, 'Clash');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

function trimVersion(version, channel) {
  return channel === 'stable' ? version.replace(/^v/u, '') : version;
}

function formatHistoryDate(dateLine) {
  return dateLine.replace(/\s+CST$/u, '').slice(0, 16);
}

function extractLatestSection(section, channel) {
  const versionMatch =
    section.match(/>\s*当前\s*(?:稳定|Beta)\s*版本：`([^`]+)`/u) ??
    section.match(/data-version="([^"]+)"/u);
  const dateMatch =
    section.match(/>\s*发布时间：([^\n]+)/u) ??
    section.match(/data-release-date="([^"]+)"/u);
  const releaseMatch =
    section.match(/>\s*-\s*发布页：<([^>]+)>/u) ??
    section.match(/data-release-url="([^"]+)"/u);
  const summaryMatch =
    section.match(/\n### 📋 本次更新\n\n([\s\S]*?)\n::: details/u) ??
    section.match(
      />\s*-\s*下载方式：[^\n]+\n([\s\S]*?)\n::: details/u,
    );

  return {
    version: versionMatch?.[1] ?? '',
    normalizedVersion: trimVersion(versionMatch?.[1] ?? '', channel),
    date: dateMatch?.[1]?.trim() ?? '',
    releaseUrl: releaseMatch?.[1] ?? '',
    summary: summaryMatch?.[1]?.trim() ?? '',
  };
}

function buildLatestBlock(options) {
  const summary = renderSummary(options.aiSummary);
  const releaseUrl =
    `https://github.com/msm9527/msm-wiki/releases/tag/${options.version}`;
  const installUrl =
    options.channel === 'beta'
      ? '/zh/guide/releases-beta.html#一键安装'
      : '/zh/guide/install-linux.html';
  const displayVersion =
    options.channel === 'beta'
      ? options.version
      : `v${options.baseVersion}`;

  return [
    `<div class="msm-release-hero msm-release-hero--${escapeHtml(options.channel)}" data-version="${escapeHtml(options.version)}" data-release-date="${escapeHtml(options.commitDate)}" data-release-url="${escapeHtml(releaseUrl)}">`,
    '  <div class="msm-release-hero-copy">',
    `    <span class="msm-release-kicker">MSM / ${escapeHtml(options.channelName)}</span>`,
    `    <h3 class="msm-release-version"><span>${escapeHtml(options.channelName)}</span> <code>${escapeHtml(displayVersion)}</code></h3>`,
    `    <p class="msm-release-lede">${escapeHtml(options.releaseDownloadNote)}</p>`,
    '  </div>',
    '  <div class="msm-release-actions">',
    `    <a class="msm-release-action msm-release-action--primary" href="${escapeHtml(releaseUrl)}" target="_blank" rel="noreferrer">查看 Release <span aria-hidden="true">↗</span></a>`,
    `    <a class="msm-release-action" href="${escapeHtml(installUrl)}">安装指南 <span aria-hidden="true">→</span></a>`,
    '  </div>',
    '</div>',
    '<div class="msm-release-metrics" aria-label="发布概览">',
    `  <div class="msm-release-metric"><span>版本</span><strong>${escapeHtml(displayVersion)}</strong></div>`,
    `  <div class="msm-release-metric"><span>发布时间</span><strong>${escapeHtml(options.commitDate)}</strong></div>`,
    `  <div class="msm-release-metric"><span>源提交</span><a href="https://github.com/msm9527/msm/commit/${escapeHtml(options.commitShaFull)}" target="_blank" rel="noreferrer"><code>${escapeHtml(options.commitSha)}</code></a></div>`,
    `  <div class="msm-release-metric"><span>发布类型</span><strong>${escapeHtml(options.channelName)}</strong></div>`,
    '</div>',
    `<p class="msm-release-download-note"><span>下载说明</span>${escapeHtml(options.releaseDownloadNote)}</p>`,
    '',
    '### 📋 本次更新',
    '',
    summary,
    '',
    '::: details 📋 构建信息',
    `- **发布通道**: ${options.channel}（${options.channelName}）`,
    `- **源提交**: [\`${options.commitSha}\`](https://github.com/msm9527/msm/commit/${options.commitShaFull})`,
    `- **提交信息**: ${normalizePublicTerminology(options.commitMessage)}`,
    `- **提交作者**: ${options.commitAuthor}`,
    `- **提交时间**: ${options.commitDate}`,
    ':::',
    '',
    '---',
  ].join('\n');
}

function renderHistoryGroup(title, items) {
  if (items.length === 0) return '';
  return [title, ...items].join('\n');
}

function buildHistoryEntry(section, options) {
  const current = extractLatestSection(section, options.channel);
  if (!current.version || !current.date || !current.releaseUrl) {
    return '';
  }

  const sections = parseSummary(current.summary);
  const addedChanged = [...sections.added, ...sections.changed];
  const notes = [...sections.deprecated, ...sections.notes];
  const historyLabel = `${current.normalizedVersion || current.version} · ${formatHistoryDate(current.date)} · ${options.channelName}`;

  const blocks = [
    `::: details ${historyLabel}`,
    '',
    `<div class="msm-release-history-link"><a href="${escapeHtml(current.releaseUrl)}" target="_blank" rel="noreferrer">查看 GitHub Release <span aria-hidden="true">↗</span></a></div>`,
  ];

  const grouped = [
    renderHistoryGroup('**新增 / 优化**', addedChanged),
    renderHistoryGroup('**问题修复**', sections.fixed),
    renderHistoryGroup('**注意事项**', notes),
  ].filter(Boolean);

  if (grouped.length > 0) {
    blocks.push('', grouped.join('\n\n'));
  }

  blocks.push('', ':::');
  return blocks.join('\n');
}

function findNextH2(content, startIndex) {
  const nextIndex = content.indexOf('\n## ', startIndex);
  return nextIndex === -1 ? content.length : nextIndex;
}

function splitHistoryBody(historyBody) {
  const firstEntryIndex = historyBody.search(/\n(?:### |::: details )/u);
  if (firstEntryIndex === -1) {
    return {
      intro: historyBody.trim(),
      entries: '',
    };
  }

  return {
    intro: historyBody.slice(0, firstEntryIndex).trim(),
    entries: historyBody.slice(firstEntryIndex + 1).trim(),
  };
}

function updateReleasePage(options) {
  const content = fs.readFileSync(options.releasesPath, 'utf-8');
  const latestIndex = content.indexOf(options.latestVersionMarker);
  const historyIndex = content.indexOf(options.historyVersionMarker);

  if (latestIndex === -1 || historyIndex === -1 || latestIndex >= historyIndex) {
    throw new Error(`未找到有效标记: ${options.releasesPath}`);
  }

  const latestBodyStart = latestIndex + options.latestVersionMarker.length;
  const historyBodyStart = historyIndex + options.historyVersionMarker.length;
  const historySectionEnd = findNextH2(content, historyBodyStart);
  const currentLatest = content.slice(latestBodyStart, historyIndex).trim();
  const historyBody = content.slice(historyBodyStart, historySectionEnd);
  const { intro, entries } = splitHistoryBody(historyBody);
  const currentMeta = extractLatestSection(currentLatest, options.channel);
  const sameVersion =
    currentMeta.normalizedVersion === trimVersion(options.version, options.channel);
  const historyEntry = sameVersion ? '' : buildHistoryEntry(currentLatest, options);
  const historyTitle = historyEntry.split('\n', 1)[0];
  const historyParts = [intro];

  if (historyEntry && !entries.includes(historyTitle)) {
    historyParts.push(historyEntry);
  }
  if (entries) {
    historyParts.push(entries);
  }

  const nextContent = [
    content.slice(0, latestIndex + options.latestVersionMarker.length).trimEnd(),
    '',
    buildLatestBlock(options),
    '',
    options.historyVersionMarker,
    '',
    historyParts.filter(Boolean).join('\n\n').trim(),
    content.slice(historySectionEnd),
  ].join('\n');

  fs.writeFileSync(options.releasesPath, nextContent.replace(/\n{3,}/g, '\n\n'));
}

module.exports = updateReleasePage;
