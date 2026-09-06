const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SHA_PATTERN = /^[0-9a-f]{40}$/iu;
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._/-]{0,159}$/iu;
const SOURCES = new Set(['previous-source-commit', 'release-time-window', 'fallback-recent-commits']);
const FAILURE_LABELS = {
  'missing-api-key': '未配置 MODELSCOPE_API_KEY',
  'quota-exhausted': '模型余额或配额不足',
  'rate-limited': '模型请求受到限流',
  'unsupported-model': '候选模型暂无可用提供商',
  'authentication-failed': '模型凭据无效或无访问权限',
  'timeout': '模型请求超时',
  'request-failed': '模型请求失败',
  'invalid-output': '模型输出未通过公开摘要检查',
};
const ATTEMPT_STATUSES = new Set(['success', 'failed', 'unknown']);
const ATTEMPT_REASONS = new Set(['ok', 'unknown', ...Object.keys(FAILURE_LABELS)]);
const COVERAGE_FIELDS = ['totalCommits', 'detailedCommits', 'totalFiles', 'sampledFiles', 'commitsWithDiff', 'incompleteDiffs'];
const BASELINE_COVERAGE_FIELDS = ['rawCommitCount', 'releaseLineCommits', 'excludedHistoricalCommits', 'netChangedFiles', 'netSampledFiles'];
// Publish only fixed diagnostic codes, never the model output or provider message.
const OUTPUT_CHECKS = [
  ['truncated', /达到输出上限|已截断/u],
  ['unexpected-finish', /模型输出未正常结束/u],
  ['empty-output', /模型返回空白内容/u],
  ['missing-text', /API 响应缺少文本内容/u],
  ['unclosed-thinking', /模型思考内容未完整结束/u],
  ['html-or-fence', /输出包含代码围栏或 HTML/u],
  ['refusal-or-explanation', /模型返回拒绝或解释性内容/u],
  ['unknown-heading', /未知发布分类/u],
  ['duplicate-heading', /重复发布分类/u],
  ['placeholder-item', /发布条目为空、占位或缺少具体内容/u],
  ['unclosed-bold', /粗体标记未闭合/u],
  ['non-list-content', /分类之外出现非列表内容/u],
  ['empty-category', /分类 .* 没有实际条目/u],
  ['missing-details', /缺少详细变更分类/u],
  ['too-many-highlights', /亮点超过 6 条/u],
  ['unverified-claims', /未经单独验证的绝对化或量化宣传/u],
  ['credential-echo', /模型输出包含敏感凭据/u],
];

function validateReleaseSummaryInputs({ sourceRef = 'dev', previousCommit = '', channel = 'beta' } = {}) {
  const ref = String(sourceRef).trim();
  const previous = String(previousCommit).trim();
  if (!ref || ref.length > 200 || !/^[a-z0-9][a-z0-9._/-]*$/iu.test(ref)
      || ref.includes('..') || ref.includes('//') || ref.endsWith('/') || ref.endsWith('.lock')) {
    throw new Error('source_ref 必须是有效的分支名、tag 或完整提交 SHA');
  }
  if (previous && !SHA_PATTERN.test(previous)) {
    throw new Error('previous_commit 必须为空或完整的 40 位十六进制提交 SHA');
  }
  if (!['stable', 'beta'].includes(channel)) {
    throw new Error('channel 仅支持 stable 或 beta');
  }
  return { sourceRef: ref, previousCommit: previous, channel };
}

function countSummaryItems(summary) {
  let itemCount = 0;
  let highlightCount = 0;
  let inHighlights = false;
  for (const line of String(summary).split('\n')) {
    if (/^#{1,6}\s/u.test(line)) inHighlights = /亮点|看点|Highlights/iu.test(line);
    if (/^[-*+]\s+\S/u.test(line)) {
      itemCount += 1;
      if (inHighlights) highlightCount += 1;
    }
  }
  return { itemCount, highlightCount };
}

function failureCode(error) {
  const message = String(error?.message || error || '');
  if (/insufficient balance|quota|余额|配额/iu.test(message)) return 'quota-exhausted';
  if (/no provider|unsupported.*model|model.*not found/iu.test(message)) return 'unsupported-model';
  if (/401|403|unauthorized|forbidden|invalid.*(?:key|token)|鉴权|无权限/iu.test(message)) return 'authentication-failed';
  if (/timeout|timed out|超时/iu.test(message)) return 'timeout';
  if (/输出.*(?:校验|截断|未正常结束|敏感凭据)|invalid.*(?:output|summary)|达到输出上限/iu.test(message)) return 'invalid-output';
  if (/429|rate.?limit|限流/iu.test(message)) return 'rate-limited';
  return 'request-failed';
}

function safeModelName(value) {
  return MODEL_PATTERN.test(String(value || '')) ? String(value) : '';
}

function publicCoverage(context) {
  const fields = [...COVERAGE_FIELDS, ...BASELINE_COVERAGE_FIELDS.filter(field => Object.hasOwn(context.coverage || {}, field))];
  return Object.fromEntries(fields.map(field => {
    const value = context.coverage?.[field];
    const maxValue = ['totalCommits', 'detailedCommits', 'commitsWithDiff', 'incompleteDiffs'].includes(field)
      ? context.commits.length : Number.MAX_SAFE_INTEGER;
    return [field, Number.isSafeInteger(value) && value >= 0 && value <= maxValue ? value : null];
  }));
}

function redactSecrets(value, env) {
  let result = String(value || '');
  for (const [name, secret] of Object.entries(env)) {
    if (/(?:TOKEN|KEY|SECRET|PASSWORD)$/u.test(name) && typeof secret === 'string' && secret.length >= 4) {
      result = result.split(secret).join('[REDACTED]');
    }
  }
  return result;
}

function publicModelAttempts(attempts, env) {
  if (!Array.isArray(attempts)) return [];
  return attempts.slice(0, 1000).filter(attempt => attempt && typeof attempt === 'object').map(attempt => {
    const model = safeModelName(redactSecrets(attempt.model || attempt.modelName, env)) || 'unknown-model';
    const status = ATTEMPT_STATUSES.has(attempt.status) ? attempt.status : 'unknown';
    const reasonCode = status === 'success' ? 'ok' : status === 'unknown' ? 'unknown'
      : ATTEMPT_REASONS.has(attempt.reasonCode) && attempt.reasonCode !== 'ok'
        ? attempt.reasonCode
        : failureCode(attempt.error);
    // Explicit projection: never retain provider messages, headers, prompts or other fields.
    const checks = status === 'failed' ? OUTPUT_CHECKS.filter(([, pattern]) => pattern.test(String(attempt.error || ''))).map(([code]) => code) : [];
    return { model, status, reasonCode, ...(checks.length ? { checks } : {}) };
  });
}

function isPublicSummary(summary) {
  return summary.trim().length > 0
    && summary.length <= 80000
    && !/```|diff --git|^@@\s|^\+\+\+ b\/|^--- a\/|提交上下文（共|Diff 摘要:/mu.test(summary);
}

function createGit(cwd) {
  return args => {
    try {
      return execFileSync('git', args, {
        cwd,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      });
    } catch {
      // Child-process errors include private command output. Never forward them to Actions.
      throw new Error('读取 MSM 提交上下文失败，请检查 source_ref 和 previous_commit');
    }
  };
}

function formatJobSummary(result) {
  const state = { ai: '✅ AI 生成', fallback: '⚠️ 规则回退（非 AI）', 'no-changes': 'ℹ️ 无新增提交' }[result.status];
  const reason = result.fallbackReason ? `\n> ${FAILURE_LABELS[result.fallbackReason]}；已保留规则摘要，请检查模型配置或账户额度。\n` : '';
  const attempts = result.modelAttempts.length
    ? `\n### 模型尝试结果\n\n| 次序 | 模型 | 状态 | 原因码 |\n| --- | --- | --- | --- |\n${result.modelAttempts.map((attempt, index) => `| ${index + 1} | ${attempt.model} | ${attempt.status} | ${attempt.reasonCode} |`).join('\n')}\n`
    : '';
  const hasBaseline = BASELINE_COVERAGE_FIELDS.some(field => result.coverage[field] != null);
  const baselineRows = hasBaseline
    ? `| 完整提交图记录数 | ${result.coverage.rawCommitCount ?? '—'} |\n| 第一父链发布线记录数（筛选前） | ${result.coverage.releaseLineCommits ?? '—'} |\n| 未单列到上下文的图记录数 | ${result.coverage.excludedHistoricalCommits ?? '—'} |\n| 净差异已采样文件 / 变更文件 | ${result.coverage.netSampledFiles ?? '—'} / ${result.coverage.netChangedFiles ?? '—'} |\n`
    : '';
  const baselineNote = hasBaseline
    ? '\n> 图记录数不是新增功能数；未单列的记录不等于没有新代码，侧分支变化由版本间净差异统一提供证据。\n'
    : '';
  return `## 发布日志生成结果\n\n| 项目 | 结果 |\n| --- | --- |\n| 通道 | ${result.channel} |\n| 生成状态 | ${state} |\n| 成功模型 | ${result.modelName || '—'} |\n| 模型尝试次数 | ${result.attemptCount} |\n| 发布线上下文提交数 | ${result.commitCount} |\n${baselineRows}| 日志条目数（含亮点） | ${result.itemCount} |\n| 亮点条目数 | ${result.highlightCount} |\n| 已读取正文与文件列表的上下文提交 | ${result.coverage.detailedCommits ?? '—'} |\n| 已采样 Diff 的上下文提交 | ${result.coverage.commitsWithDiff ?? '—'} |\n| 逐提交累计已采样文件 / 变更文件（非唯一） | ${result.coverage.sampledFiles ?? '—'} / ${result.coverage.totalFiles ?? '—'} |\n| Diff 未完整展开的上下文提交 | ${result.coverage.incompleteDiffs ?? '—'} |\n| 范围来源 | ${result.source} |\n\n> 上述覆盖计数反映输入上下文的采样，不代表模型已逐项覆盖全部功能。\n${baselineNote}${reason}${attempts}\n### 公开发布日志\n\n${result.summary}\n`;
}

/**
 * Shared Actions runner. Inputs are read from env (never interpolated into JS):
 * MODELSCOPE_API_KEY, MODELSCOPE_MODELS (optional comma-separated override),
 * RELEASE_CURRENT_REF, RELEASE_PREVIOUS_COMMIT, RELEASE_CHANNEL,
 * RELEASE_LOG_SINCE_EPOCH, RELEASE_LOG_UNTIL_EPOCH, RELEASE_PREVIOUS_PUBLISHED_AT,
 * RELEASE_REQUIRE_EXACT_RANGE (preview: reject an invalid/missing ancestor).
 * Returns only the public summary and non-sensitive generation metadata.
 * modelAttempts projects core attempts into { model, status, reasonCode } only;
 * provider error text is classified in memory and never included in reports.
 * Optional artifactDirectory contains exactly summary.md and metadata.json.
 */
async function generateReleaseSummary({
  core,
  env = process.env,
  cwd = process.cwd(),
  fetchImpl = globalThis.fetch,
  artifactDirectory,
  summaryModule = require('./ai-release-summary.cjs'),
  git = createGit(cwd),
} = {}) {
  const inputs = validateReleaseSummaryInputs({
    sourceRef: env.RELEASE_CURRENT_REF || 'HEAD',
    previousCommit: env.RELEASE_PREVIOUS_COMMIT || '',
    channel: env.RELEASE_CHANNEL || 'beta',
  });
  if (env.RELEASE_REQUIRE_EXACT_RANGE === 'true' && inputs.previousCommit) {
    try {
      git(['cat-file', '-e', `${inputs.previousCommit}^{commit}`]);
      git(['merge-base', '--is-ancestor', inputs.previousCommit, inputs.sourceRef]);
    } catch {
      throw new Error('previous_commit 不存在或不是 source_ref 的祖先，已停止预览以避免汇总错误范围');
    }
  }

  let context;
  try {
    context = summaryModule.collectReleaseCommits({
      currentRef: inputs.sourceRef,
      previousCommit: inputs.previousCommit,
      logSinceEpoch: env.RELEASE_LOG_SINCE_EPOCH || '',
      logUntilEpoch: env.RELEASE_LOG_UNTIL_EPOCH || '',
      git,
    });
  } catch {
    throw new Error('无法收集发布范围内的提交，未生成发布日志');
  }
  const commits = context.commits;
  const loggedAttempts = [];
  let structuredAttempts = [];
  function recordStructuredAttempts(value) {
    const safeAttempts = publicModelAttempts(value, env);
    if (safeAttempts.length) structuredAttempts = safeAttempts;
  }
  let lastFailure = '';
  const logger = {
    log(message) {
      // Only extract a model ID from known log events. Do not relay the message.
      const match = String(message).match(/^尝试使用模型[:：]\s*([a-z0-9][a-z0-9._/-]*)\s*$/iu);
      if (match && loggedAttempts.length < 1000) {
        loggedAttempts.push({ model: safeModelName(redactSecrets(match[1], env)) || 'unknown-model', status: 'unknown', reasonCode: 'unknown' });
      }
    },
    error(...messages) {
      lastFailure = failureCode(messages.join(' '));
      if (loggedAttempts.length) Object.assign(loggedAttempts.at(-1), { status: 'failed', reasonCode: lastFailure });
    },
    warn(...messages) { lastFailure = failureCode(messages.join(' ')); },
    info(message) { this.log(message); },
  };
  let summary = '';
  let modelName = '';
  let reportedAttempts = 0;
  let status = commits.length ? 'fallback' : 'no-changes';
  let fallbackReason = '';
  if (commits.length && !env.MODELSCOPE_API_KEY) {
    fallbackReason = 'missing-api-key';
  } else if (commits.length) {
    try {
      const configuredModels = String(env.MODELSCOPE_MODELS || '').split(',').map(value => value.trim()).filter(Boolean);
      if (configuredModels.some(value => !safeModelName(value))) throw new Error('Invalid model configuration');
      let reportedModel = '';
      const result = await summaryModule.requestModelScopeSummary({
        apiKey: env.MODELSCOPE_API_KEY,
        prompt: summaryModule.buildSummaryPrompt(commits),
        fetchImpl,
        ...(configuredModels.length ? { modelCandidates: configuredModels } : {}),
        logger,
        onResult(value) {
          // Do not retain the full callback object: it may include non-public evidence.
          reportedModel = safeModelName(redactSecrets(value?.model || value?.modelName, env));
          recordStructuredAttempts(value?.attempts);
          const count = Array.isArray(value?.attempts) ? value.attempts.length : value?.attempts;
          if (Number.isSafeInteger(count) && count >= 0 && count <= 1000) reportedAttempts = count;
        },
      });
      recordStructuredAttempts(result?.attempts);
      // Keep compatibility with both the original string API and model-aware results.
      summary = redactSecrets(typeof result === 'string' ? result : result?.summary, env);
      if (!isPublicSummary(summary)) {
        fallbackReason = 'invalid-output';
        throw new Error('Invalid public summary');
      }
      modelName = reportedModel
        || safeModelName(redactSecrets(typeof result === 'object' && result?.modelName, env))
        || safeModelName(loggedAttempts.at(-1)?.model);
      status = 'ai';
    } catch (error) {
      recordStructuredAttempts(error?.attempts);
      const structuredFailure = structuredAttempts.findLast(attempt => attempt.status === 'failed')?.reasonCode;
      fallbackReason ||= (Object.hasOwn(FAILURE_LABELS, structuredFailure) && structuredFailure) || lastFailure || failureCode(error);
    }
  }
  if (status !== 'ai') {
    try {
      summary = redactSecrets(summaryModule.buildFallbackSummary(commits, env.RELEASE_PREVIOUS_PUBLISHED_AT || ''), env);
    } catch {
      throw new Error('规则摘要生成失败，未输出任何私有上下文');
    }
    if (!isPublicSummary(summary)) throw new Error('规则摘要包含非公开上下文，已停止输出');
  }
  const modelAttempts = structuredAttempts.length ? structuredAttempts : loggedAttempts.map(attempt => ({ ...attempt }));
  if (status === 'ai' && modelName) {
    const selected = modelAttempts.findLast(attempt => attempt.model === modelName);
    if (selected) Object.assign(selected, { status: 'success', reasonCode: 'ok' });
    else modelAttempts.push({ model: modelName, status: 'success', reasonCode: 'ok' });
  } else if (modelAttempts.length) {
    const lastAttempt = modelAttempts.at(-1);
    if (lastAttempt.status === 'unknown' || fallbackReason === 'invalid-output') {
      Object.assign(lastAttempt, { status: 'failed', reasonCode: fallbackReason || 'request-failed' });
    }
  }
  const result = {
    summary,
    status,
    modelName,
    channel: inputs.channel,
    commitCount: commits.length,
    ...countSummaryItems(summary),
    attemptCount: Math.max(loggedAttempts.length, modelAttempts.length, reportedAttempts, status === 'ai' ? 1 : 0),
    modelAttempts,
    fallbackReason,
    source: SOURCES.has(context.source) ? context.source : 'unknown',
    coverage: publicCoverage(context),
  };
  if (core) {
    core.setOutput('summary', result.summary);
    core.setOutput('status', result.status);
    core.setOutput('model', result.modelName);
    core.setOutput('commit_count', result.commitCount);
    core.setOutput('item_count', result.itemCount);
    core.info(`发布日志：${result.status}；模型=${result.modelName || '无'}；发布线上下文提交=${result.commitCount}；条目=${result.itemCount}；亮点=${result.highlightCount}`);
    result.modelAttempts.forEach((attempt, index) => {
      core.info(`模型尝试 ${index + 1}：${attempt.model}；status=${attempt.status}；reasonCode=${attempt.reasonCode}${attempt.checks?.length ? '；checks=' + attempt.checks.join(',') : ''}`);
    });
    if (fallbackReason) {
      core.warning(`${FAILURE_LABELS[fallbackReason]}；已使用规则回退（非 AI）。上下文提交 ${result.commitCount} 个，日志 ${result.itemCount} 条。`);
    }
    await core.summary.addRaw(formatJobSummary(result)).write();
  }
  if (artifactDirectory) {
    fs.mkdirSync(artifactDirectory, { recursive: true });
    fs.writeFileSync(path.join(artifactDirectory, 'summary.md'), `${result.summary}\n`);
    const { summary: _summary, ...metadata } = result;
    fs.writeFileSync(path.join(artifactDirectory, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  }
  return result;
}

module.exports = { generateReleaseSummary, validateReleaseSummaryInputs, countSummaryItems };
