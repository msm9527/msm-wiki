const fs = require('fs');

const SECTION_DEFS = [
  {
    key: 'added',
    title: '### ✨ 新增（Added）',
    patterns: [/^#{2,3}\s*✨\s*新增(?:（Added）)?\s*$/u],
  },
  {
    key: 'changed',
    title: '### 🔧 变更（Changed）',
    patterns: [/^#{2,3}\s*🔧\s*变更(?:（Changed）)?\s*$/u],
  },
  {
    key: 'fixed',
    title: '### 🐛 修复（Fixed）',
    patterns: [/^#{2,3}\s*🐛\s*修复(?:（Fixed）)?\s*$/u],
  },
  {
    key: 'deprecated',
    title: '### ⚠️ 废弃（Deprecated）',
    patterns: [
      /^#{2,3}\s*⚠️\s*废弃(?:（Deprecated）)?\s*$/u,
      /^#{2,3}\s*⚠️\s*备注(?:（Notes）)?\s*$/u,
    ],
  },
  {
    key: 'notes',
    title: '### 📝 备注（Notes）',
    patterns: [
      /^#{2,3}\s*📝\s*备注(?:（Notes）)?\s*$/u,
      /^#{2,3}\s*📝\s*备注\s*$/u,
    ],
  },
];

function detectSection(line) {
  return SECTION_DEFS.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(line.trim())),
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

    const sectionKey = detectSection(line);
    if (sectionKey) {
      activeKey = sectionKey;
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
  const rendered = SECTION_DEFS.flatMap(({ key, title }) =>
    sections[key].length > 0 ? [title, ...sections[key], ''] : [],
  );

  if (rendered.length === 0) {
    return ['### 📝 备注（Notes）', '- 暂无更新说明'].join('\n');
  }

  return rendered.join('\n').trim();
}

function normalizePublicTerminology(value) {
  return String(value ?? '').replace(/\bmihomo\b/giu, 'Clash');
}

function trimVersion(version, channel) {
  return channel === 'stable' ? version.replace(/^v/u, '') : version;
}

function formatHistoryDate(dateLine) {
  return dateLine.replace(/\s+CST$/u, '').slice(0, 16);
}

function extractLatestSection(section, channel) {
  const versionMatch = section.match(/>\s*当前(?:稳定|Beta)版本：`([^`]+)`/u);
  const dateMatch = section.match(/>\s*发布时间：([^\n]+)/u);
  const releaseMatch = section.match(/>\s*-\s*发布页：<([^>]+)>/u);
  const summaryMatch = section.match(
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
  const versionLabel =
    options.channel === 'beta'
      ? `当前 Beta 版本：\`${options.version}\``
      : `当前稳定版本：\`v${options.baseVersion}\``;

  const summary = renderSummary(options.aiSummary);

  return [
    `> ${versionLabel}  `,
    `> 发布时间：${options.commitDate}  `,
    `> - 发布页：<https://github.com/msm9527/msm-wiki/releases/tag/${options.version}>  `,
    `> - 下载方式：${options.releaseDownloadNote}`,
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

function buildHistoryEntry(section, channel) {
  const current = extractLatestSection(section, channel);
  if (!current.version || !current.date || !current.releaseUrl) {
    return '';
  }

  const sections = parseSummary(current.summary);
  const addedChanged = [...sections.added, ...sections.changed];
  const notes = [...sections.deprecated, ...sections.notes];
  const badge =
    channel === 'beta'
      ? '<Badge type="tip" text="Beta 版" />'
      : '<Badge type="info" text="稳定版" />';

  const blocks = [
    `### ${current.version}（${formatHistoryDate(current.date)}） ${badge}`,
    '',
    `- 发布页：<${current.releaseUrl}>`,
  ];

  const grouped = [
    renderHistoryGroup('**新增 / 优化**', addedChanged),
    renderHistoryGroup('**问题修复**', sections.fixed),
    renderHistoryGroup('**注意事项**', notes),
  ].filter(Boolean);

  if (grouped.length > 0) {
    blocks.push('', grouped.join('\n\n'));
  }

  blocks.push('', '---');
  return blocks.join('\n');
}

function findNextH2(content, startIndex) {
  const nextIndex = content.indexOf('\n## ', startIndex);
  return nextIndex === -1 ? content.length : nextIndex;
}

function splitHistoryBody(historyBody) {
  const firstEntryIndex = historyBody.indexOf('\n### ');
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
  const historyEntry = sameVersion
    ? ''
    : buildHistoryEntry(currentLatest, options.channel);
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
