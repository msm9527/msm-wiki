const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { generateReleaseSummary, validateReleaseSummaryInputs, countSummaryItems } = require('../scripts/generate-release-summary.cjs');

const publicSummary = '### 🎉 本次亮点\n- **Docker 管理升级**：更直观地管理容器。\n\n### ✨ 功能增强\n- 完善 Compose 操作反馈。\n\n### 🐛 问题修复\n- 修复登录状态过期后仍持续请求的问题。';
const fallbackSummary = '### 🐛 问题修复\n- 修复登录状态问题。';
const privateContext = 'PRIVATE_SOURCE_DIFF_NOT_FOR_ARTIFACTS';

function makeCore() {
  const outputs = {};
  const logs = [];
  const warnings = [];
  let jobSummary = '';
  return {
    outputs, logs, warnings,
    get jobSummary() { return jobSummary; },
    setOutput(name, value) { outputs[name] = value; },
    info(value) { logs.push(value); },
    warning(value) { warnings.push(value); },
    summary: {
      addRaw(value) { jobSummary += value; return this; },
      async write() {},
    },
  };
}

function makeModule(overrides = {}) {
  return {
    collectReleaseCommits() { return { commits: [{ subject: privateContext, diff: privateContext }], source: 'previous-source-commit', rangeArgs: [privateContext] }; },
    buildSummaryPrompt() { return privateContext; },
    buildFallbackSummary() { return fallbackSummary; },
    async requestModelScopeSummary({ logger }) {
      logger.log('尝试使用模型: Strong/Model');
      return { summary: publicSummary, modelName: 'Strong/Model', usage: { prompt_tokens: 123 } };
    },
    ...overrides,
  };
}

test('runner leaves an empty model override undefined, reports model and only public information', async () => {
  const core = makeCore();
  const result = await generateReleaseSummary({
    core,
    env: { MODELSCOPE_API_KEY: 'secret-key', MODELSCOPE_MODELS: ' , ', RELEASE_CURRENT_REF: 'a'.repeat(40), RELEASE_CHANNEL: 'stable' },
    summaryModule: makeModule({
      async requestModelScopeSummary(options) {
        assert.equal(Object.hasOwn(options, 'modelCandidates'), false);
        assert.equal(options.prompt, privateContext);
        options.logger.log('尝试使用模型: Strong/Model');
        options.logger.log(privateContext);
        return { summary: publicSummary, modelName: 'Strong/Model' };
      },
    }),
  });
  assert.equal(result.status, 'ai');
  assert.equal(result.modelName, 'Strong/Model');
  assert.equal(result.channel, 'stable');
  assert.equal(result.commitCount, 1);
  assert.equal(result.itemCount, 3);
  assert.equal(result.highlightCount, 1);
  assert.equal(core.outputs.summary, publicSummary);
  assert.equal(core.outputs.status, 'ai');
  assert.match(core.jobSummary, /Strong\/Model/);
  assert.match(core.jobSummary, /公开发布日志/);
  assert.equal(core.warnings.length, 0);
  assert.doesNotMatch(JSON.stringify(core), new RegExp(`${privateContext}|secret-key`));
});

test('runner passes explicit model overrides and supports the string-returning core', async () => {
  const result = await generateReleaseSummary({
    env: { MODELSCOPE_API_KEY: 'secret-key', MODELSCOPE_MODELS: ' Strong/First, Strong/Second ' },
    summaryModule: makeModule({
      async requestModelScopeSummary({ modelCandidates, logger }) {
        assert.deepEqual(modelCandidates, ['Strong/First', 'Strong/Second']);
        logger.log('尝试使用模型: Strong/First');
        logger.error('模型 Strong/First 调用失败:', '429 insufficient balance');
        logger.log('尝试使用模型: Strong/Second');
        return publicSummary;
      },
    }),
  });
  assert.equal(result.modelName, 'Strong/Second');
  assert.equal(result.status, 'ai');
  assert.equal(result.attemptCount, 2);
  assert.deepEqual(result.modelAttempts, [
    { model: 'Strong/First', status: 'failed', reasonCode: 'quota-exhausted' },
    { model: 'Strong/Second', status: 'success', reasonCode: 'ok' },
  ]);
  assert.equal(result.fallbackReason, '');
});

test('missing key uses an explicit fallback, emits a warning and never calls inference', async () => {
  const core = makeCore();
  const result = await generateReleaseSummary({
    core, env: {},
    summaryModule: makeModule({ requestModelScopeSummary() { assert.fail('must not infer without a key'); } }),
  });
  assert.equal(result.status, 'fallback');
  assert.equal(result.fallbackReason, 'missing-api-key');
  assert.equal(result.summary, fallbackSummary);
  assert.equal(result.modelName, '');
  assert.equal(result.attemptCount, 0);
  assert.deepEqual(result.modelAttempts, []);
  assert.equal(core.warnings.length, 1);
  assert.match(core.warnings[0], /非 AI/);
  assert.match(core.jobSummary, /规则回退/);
});

test('API failure logs contain neither response bodies nor credentials or private context', async () => {
  const core = makeCore();
  const result = await generateReleaseSummary({
    core, env: { MODELSCOPE_API_KEY: 'secret-key' },
    summaryModule: makeModule({
      async requestModelScopeSummary({ logger }) {
        logger.log('尝试使用模型: Strong/Model');
        logger.error('模型 Strong/Model 调用失败:', `429 insufficient balance secret-key ${privateContext}`);
        throw new Error(`429 insufficient balance secret-key ${privateContext}`);
      },
    }),
  });
  assert.equal(result.status, 'fallback');
  assert.equal(result.fallbackReason, 'quota-exhausted');
  assert.match(core.warnings[0], /余额或配额不足/);
  assert.doesNotMatch(JSON.stringify({ result, core }), new RegExp(`secret-key|${privateContext}`));
});

test('empty release ranges produce a no-changes report without an AI request', async () => {
  const core = makeCore();
  const result = await generateReleaseSummary({
    core, env: { MODELSCOPE_API_KEY: 'secret-key' },
    summaryModule: makeModule({
      collectReleaseCommits() { return { commits: [], source: 'previous-source-commit' }; },
      buildFallbackSummary() { return '### 📌 升级提醒\n- 本次没有新增提交。'; },
      requestModelScopeSummary() { assert.fail('empty range'); },
    }),
  });
  assert.equal(result.status, 'no-changes');
  assert.equal(result.commitCount, 0);
  assert.equal(core.warnings.length, 0);
});

test('raw source diffs returned by a model are rejected instead of published', async () => {
  const result = await generateReleaseSummary({
    env: { MODELSCOPE_API_KEY: 'secret-key' },
    summaryModule: makeModule({ async requestModelScopeSummary() { return `### 🎉 重磅功能\n- feature\n\ndiff --git ${privateContext}`; } }),
  });
  assert.equal(result.status, 'fallback');
  assert.equal(result.fallbackReason, 'invalid-output');
  assert.equal(result.summary, fallbackSummary);
});

test('known secrets are redacted even if accidentally echoed in public summary text', async () => {
  const result = await generateReleaseSummary({
    env: { MODELSCOPE_API_KEY: 'secret-key', MSM_REPO_TOKEN: 'private-token' },
    summaryModule: makeModule({ async requestModelScopeSummary() { return `${publicSummary}\n- secret-key private-token`; } }),
  });
  assert.doesNotMatch(result.summary, /secret-key|private-token/);
  assert.match(result.summary, /\[REDACTED\]/);
});

test('preview artifacts contain exactly the public summary and allowlisted metadata', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-summary-runner-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const result = await generateReleaseSummary({
    env: { MODELSCOPE_API_KEY: 'secret-key' },
    summaryModule: makeModule(), artifactDirectory: temp,
  });
  assert.deepEqual(fs.readdirSync(temp).sort(), ['metadata.json', 'summary.md']);
  assert.equal(fs.readFileSync(path.join(temp, 'summary.md'), 'utf8'), `${publicSummary}\n`);
  const metadata = JSON.parse(fs.readFileSync(path.join(temp, 'metadata.json'), 'utf8'));
  assert.deepEqual(Object.keys(metadata).sort(), ['attemptCount', 'channel', 'commitCount', 'coverage', 'fallbackReason', 'highlightCount', 'itemCount', 'modelAttempts', 'modelName', 'source', 'status']);
  assert.equal(metadata.itemCount, result.itemCount);
  assert.doesNotMatch(JSON.stringify(metadata), new RegExp(`secret-key|${privateContext}|prompt|rangeArgs|body|files`));
});

test('preview input validation accepts refs and only a full optional previous SHA', () => {
  assert.deepEqual(validateReleaseSummaryInputs(), { sourceRef: 'dev', previousCommit: '', channel: 'beta' });
  assert.equal(validateReleaseSummaryInputs({ sourceRef: 'a'.repeat(40), previousCommit: 'B'.repeat(40) }).previousCommit, 'B'.repeat(40));
  assert.equal(validateReleaseSummaryInputs({ sourceRef: 'refs/tags/v1.4.1' }).sourceRef, 'refs/tags/v1.4.1');
  for (const previousCommit of ['deadbeef', 'g'.repeat(40), 'a'.repeat(41), '--all', 'HEAD~1', 'dev; echo key']) {
    assert.throws(() => validateReleaseSummaryInputs({ previousCommit }), /40 位/);
  }
  for (const sourceRef of ['--all', 'dev;echo bad', '../main', 'dev\nmain', 'dev$(id)', 'refs//main']) {
    assert.throws(() => validateReleaseSummaryInputs({ sourceRef }), /source_ref/);
  }
  assert.throws(() => validateReleaseSummaryInputs({ channel: 'nightly' }), /channel/);
});

test('strict preview rejects an unavailable/non-ancestor SHA before collecting any context', async () => {
  await assert.rejects(generateReleaseSummary({
    env: { RELEASE_PREVIOUS_COMMIT: 'a'.repeat(40), RELEASE_REQUIRE_EXACT_RANGE: 'true' },
    git() { throw new Error(privateContext); },
    summaryModule: makeModule({ collectReleaseCommits() { assert.fail('invalid range must stop'); } }),
  }), /不存在或不是 source_ref 的祖先/);
});

test('runner passes the exact release range and git adapter into the shared collector', async () => {
  const gitCalls = [];
  const git = args => { gitCalls.push(args); return ''; };
  const currentRef = 'b'.repeat(40);
  const previousCommit = 'a'.repeat(40);
  await generateReleaseSummary({
    env: { RELEASE_CURRENT_REF: currentRef, RELEASE_PREVIOUS_COMMIT: previousCommit, RELEASE_REQUIRE_EXACT_RANGE: 'true', RELEASE_LOG_SINCE_EPOCH: '1', RELEASE_LOG_UNTIL_EPOCH: '2' },
    git,
    summaryModule: makeModule({
      collectReleaseCommits(options) {
        assert.deepEqual(options, { currentRef, previousCommit, logSinceEpoch: '1', logUntilEpoch: '2', git });
        return { commits: [], source: 'previous-source-commit' };
      },
    }),
  });
  assert.deepEqual(gitCalls, [['cat-file', '-e', `${previousCommit}^{commit}`], ['merge-base', '--is-ancestor', previousCommit, currentRef]]);
});

test('collector failures never expose raw child-process output', async () => {
  await assert.rejects(generateReleaseSummary({
    env: {},
    summaryModule: makeModule({ collectReleaseCommits() { throw new Error(privateContext); } }),
  }), error => !error.message.includes(privateContext) && /无法收集/.test(error.message));
});

test('summary counts include top-level items only and recognize old/new highlight names', () => {
  assert.deepEqual(countSummaryItems('### ⭐ 本次亮点（Highlights）\n- first\n  - nested\n### 🐛 问题修复\n- second'), { itemCount: 2, highlightCount: 1 });
  assert.deepEqual(countSummaryItems('### 🎉 本次亮点\n- first\n### 🎉 重磅功能\n- major\n### ⚡ 性能优化\n- performance'), { itemCount: 3, highlightCount: 1 });
});

test('onResult selected model takes precedence and only numeric context coverage is retained', async () => {
  const core = makeCore();
  const result = await generateReleaseSummary({
    core, env: { MODELSCOPE_API_KEY: 'secret-key' },
    summaryModule: makeModule({
      collectReleaseCommits() {
        return {
          commits: [{ subject: privateContext }], source: 'previous-source-commit',
          coverage: { totalCommits: 1, detailedCommits: 1, totalFiles: 8, sampledFiles: 5, commitsWithDiff: 0, incompleteDiffs: 0, filenames: [privateContext], prompt: privateContext },
        };
      },
      async requestModelScopeSummary({ onResult, logger }) {
        logger.log('尝试使用模型: Strong/Failed');
        onResult({ model: 'Strong/Selected', attempts: 2, prompt: privateContext, coverage: { raw: privateContext } });
        return publicSummary;
      },
    }),
  });
  assert.equal(result.modelName, 'Strong/Selected');
  assert.equal(result.attemptCount, 2);
  assert.deepEqual(result.coverage, { totalCommits: 1, detailedCommits: 1, totalFiles: 8, sampledFiles: 5, commitsWithDiff: 0, incompleteDiffs: 0 });
  assert.match(core.jobSummary, /输入上下文的采样/);
  assert.doesNotMatch(JSON.stringify({ result, core }), new RegExp(privateContext));
});

test('unknown or malformed coverage is unavailable, never coerced into a success count', async () => {
  const result = await generateReleaseSummary({
    env: {},
    summaryModule: makeModule({
      collectReleaseCommits() {
        return { commits: [{}], coverage: { totalCommits: 10, detailedCommits: privateContext, commitsWithDiff: -1, incompleteDiffs: 1.5 } };
      },
    }),
  });
  assert.deepEqual(result.coverage, { totalCommits: null, detailedCommits: null, totalFiles: null, sampledFiles: null, commitsWithDiff: null, incompleteDiffs: null });
});

test('all-model failure preserves each reason code from error.attempts, never provider errors', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'msm-summary-attempts-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const core = makeCore();
  const rawMarker = `secret-key ${privateContext} RAW_PROVIDER_MESSAGE`;
  const attempts = [
    { modelName: 'Strong/Quota', status: 'failed', error: `429 insufficient balance ${rawMarker}` },
    { modelName: 'Strong/Unavailable', status: 'failed', error: `400 no provider supported ${rawMarker}` },
    { modelName: 'Strong/Limited', status: 'failed', error: `429 rate limit exceeded ${rawMarker}` },
  ];
  const result = await generateReleaseSummary({
    core, env: { MODELSCOPE_API_KEY: 'secret-key' }, artifactDirectory: temp,
    summaryModule: makeModule({
      async requestModelScopeSummary() {
        const error = new Error(rawMarker);
        error.attempts = attempts;
        throw error;
      },
    }),
  });
  assert.deepEqual(result.modelAttempts, [
    { model: 'Strong/Quota', status: 'failed', reasonCode: 'quota-exhausted' },
    { model: 'Strong/Unavailable', status: 'failed', reasonCode: 'unsupported-model' },
    { model: 'Strong/Limited', status: 'failed', reasonCode: 'rate-limited' },
  ]);
  assert.equal(result.attemptCount, 3);
  assert.equal(result.fallbackReason, 'rate-limited');
  assert.match(core.jobSummary, /Strong\/Quota \| failed \| quota-exhausted/);
  assert.match(core.jobSummary, /Strong\/Unavailable \| failed \| unsupported-model/);
  assert.ok(core.logs.some(line => line.includes('Strong/Limited') && line.includes('reasonCode=rate-limited')));
  const metadata = fs.readFileSync(path.join(temp, 'metadata.json'), 'utf8');
  assert.doesNotMatch(JSON.stringify({ result, core, metadata }), new RegExp(`secret-key|${privateContext}|RAW_PROVIDER_MESSAGE|insufficient balance|no provider supported|rate limit exceeded`));
  assert.deepEqual(JSON.parse(metadata).modelAttempts, result.modelAttempts);
  result.modelAttempts.forEach(attempt => assert.deepEqual(Object.keys(attempt).sort(), ['model', 'reasonCode', 'status']));
});

test('structured attempts from result and onResult are projected safely without duplicate entries', async () => {
  for (const source of ['result', 'callback']) {
    const core = makeCore();
    const attempts = [
      { model: 'Strong/Unavailable', status: 'failed', reasonCode: 'unsupported-model', error: privateContext, headers: { Authorization: 'secret-key' }, prompt: privateContext },
      { modelName: 'Strong/Selected', status: 'success', reasonCode: privateContext, response: privateContext },
    ];
    const result = await generateReleaseSummary({
      core, env: { MODELSCOPE_API_KEY: 'secret-key' },
      summaryModule: makeModule({
        async requestModelScopeSummary({ onResult, logger }) {
          logger.log('尝试使用模型: Strong/Unavailable');
          logger.error(privateContext);
          logger.log('尝试使用模型: Strong/Selected');
          if (source === 'callback') onResult({ model: 'Strong/Selected', attempts });
          return source === 'result' ? { summary: publicSummary, modelName: 'Strong/Selected', attempts } : publicSummary;
        },
      }),
    });
    assert.deepEqual(result.modelAttempts, [
      { model: 'Strong/Unavailable', status: 'failed', reasonCode: 'unsupported-model' },
      { model: 'Strong/Selected', status: 'success', reasonCode: 'ok' },
    ]);
    assert.equal(result.attemptCount, 2);
    assert.doesNotMatch(JSON.stringify({ result, core }), new RegExp(`secret-key|${privateContext}|Authorization`));
  }
});

test('attempt projection only exposes known statuses and codes, and redacts credential-shaped model IDs', async () => {
  const core = makeCore();
  const result = await generateReleaseSummary({
    core, env: { MODELSCOPE_API_KEY: 'secret-key' },
    summaryModule: makeModule({
      async requestModelScopeSummary() {
        const error = new Error(privateContext);
        error.attempts = [
          { model: 'Strong/secret-key', status: 'failed', reasonCode: privateContext, error: `401 ${privateContext}` },
          { model: 'Strong/InvalidStatus', status: privateContext, reasonCode: privateContext, error: privateContext },
          { model: 'Strong/TimedOut', status: 'failed', error: `模型请求超时 ${privateContext}` },
          { model: 'Strong/InvalidOutput', status: 'failed', error: `模型输出校验失败: ${privateContext}` },
          { model: 'Strong/UnknownCode', status: 'failed', reasonCode: privateContext, error: privateContext },
        ];
        throw error;
      },
    }),
  });
  assert.deepEqual(result.modelAttempts, [
    { model: 'unknown-model', status: 'failed', reasonCode: 'authentication-failed' },
    { model: 'Strong/InvalidStatus', status: 'unknown', reasonCode: 'unknown' },
    { model: 'Strong/TimedOut', status: 'failed', reasonCode: 'timeout' },
    { model: 'Strong/InvalidOutput', status: 'failed', reasonCode: 'invalid-output' },
    { model: 'Strong/UnknownCode', status: 'failed', reasonCode: 'request-failed' },
  ]);
  assert.doesNotMatch(JSON.stringify({ result, core }), new RegExp(`secret-key|${privateContext}`));
});

test('real core multi-model errors become safe diagnostic metadata through the shared runner', async () => {
  const { requestModelScopeSummary } = require('../scripts/ai-release-summary.cjs');
  const core = makeCore();
  const result = await generateReleaseSummary({
    core, env: { MODELSCOPE_API_KEY: 'secret-key', MODELSCOPE_MODELS: 'Strong/Quota,Strong/NoProvider' },
    summaryModule: makeModule({ requestModelScopeSummary }),
    async fetchImpl(_url, { body }) {
      const quota = JSON.parse(body).model === 'Strong/Quota';
      return {
        ok: false, status: quota ? 429 : 400,
        async text() { return JSON.stringify({ error: { message: `${quota ? 'insufficient balance' : 'has no provider supported'} secret-key ${privateContext}` } }); },
      };
    },
  });
  assert.equal(result.status, 'fallback');
  assert.deepEqual(result.modelAttempts, [
    { model: 'Strong/Quota', status: 'failed', reasonCode: 'quota-exhausted' },
    { model: 'Strong/NoProvider', status: 'failed', reasonCode: 'unsupported-model' },
  ]);
  assert.doesNotMatch(JSON.stringify({ result, core }), new RegExp(`secret-key|${privateContext}|insufficient balance|has no provider supported`));
});

test('squash-to-merge graph counts stay separate from the release context and do not suppress fallback warnings', async () => {
  const core = makeCore();
  const coverage = {
    totalCommits: 1, detailedCommits: 1, totalFiles: 20, sampledFiles: 17, commitsWithDiff: 1, incompleteDiffs: 0,
    rawCommitCount: 112, releaseLineCommits: 1, excludedHistoricalCommits: 111, netChangedFiles: 20, netSampledFiles: 17,
  };
  const result = await generateReleaseSummary({
    core, env: { RELEASE_CHANNEL: 'stable' },
    summaryModule: makeModule({
      collectReleaseCommits() {
        return {
          commits: [{ subject: privateContext }], rawCommitCount: 112, source: 'previous-source-commit',
          coverage: { ...coverage, rawDiff: privateContext }, releaseBaseline: { diff: privateContext },
        };
      },
      buildFallbackSummary() { return '### 📌 升级提醒\n- 代码存在版本间净变化，具体功能需要审校。'; },
    }),
  });
  assert.equal(result.status, 'fallback');
  assert.equal(result.commitCount, 1);
  assert.equal(core.outputs.commit_count, 1);
  assert.equal(core.warnings.length, 1);
  assert.match(core.warnings[0], /上下文提交 1 个/);
  assert.deepEqual(result.coverage, coverage);
  assert.match(core.jobSummary, /发布线上下文提交数 \| 1 \|/);
  assert.match(core.jobSummary, /完整提交图记录数 \| 112 \|/);
  assert.match(core.jobSummary, /未单列到上下文的图记录数 \| 111 \|/);
  assert.match(core.jobSummary, /净差异已采样文件 \/ 变更文件 \| 17 \/ 20 \|/);
  assert.match(core.jobSummary, /图记录数不是新增功能数/);
  assert.match(core.jobSummary, /未单列的记录不等于没有新代码/);
  assert.match(core.jobSummary, /逐提交累计.*非唯一/);
  assert.doesNotMatch(JSON.stringify({ result, core }), new RegExp(`${privateContext}|no-changes|无新增提交`));
});

test('optional baseline coverage accepts only non-negative safe integers and never substitutes raw counts', async () => {
  const result = await generateReleaseSummary({
    env: {},
    summaryModule: makeModule({
      collectReleaseCommits() {
        return {
          commits: [{}], rawCommitCount: 112,
          coverage: { rawCommitCount: privateContext, releaseLineCommits: 3, excludedHistoricalCommits: -1, netChangedFiles: Number.MAX_SAFE_INTEGER + 1, netSampledFiles: 1.5 },
        };
      },
    }),
  });
  assert.equal(result.commitCount, 1);
  assert.equal(result.coverage.rawCommitCount, null);
  assert.equal(result.coverage.releaseLineCommits, 3);
  assert.equal(result.coverage.excludedHistoricalCommits, null);
  assert.equal(result.coverage.netChangedFiles, null);
  assert.equal(result.coverage.netSampledFiles, null);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(privateContext));
});
