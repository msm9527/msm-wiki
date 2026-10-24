#!/usr/bin/env node

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildSummaryPrompt,
  buildAIEndpoint,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_BASE_URL,
  fetchAIModels,
  fetchModelScopeModels,
  MODELSCOPE_CHAT_COMPLETIONS_URL,
  requestModelScopeSummary,
  resolveAvailableModelCandidates,
} = require('./scripts/ai-release-summary.cjs');
const { publicModelAttempts } = require('./scripts/generate-release-summary.cjs');
const { providerFailureReason } = require('./scripts/modelscope-diagnostics.cjs');

const generic = Boolean(process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || process.env.AI_API_KEY || process.env.OPENAI_API_KEY
  || process.env.AI_MODEL || process.env.AI_WIRE_API || process.env.AI_REQUIRES_OPENAI_AUTH);
const apiKey = String(process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.MODELSCOPE_API_KEY || '').trim();
const baseUrl = String(process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || (generic ? DEFAULT_AI_BASE_URL : '')).trim();
const wireApi = String(process.env.AI_WIRE_API || process.env.OPENAI_WIRE_API || (baseUrl ? 'responses' : 'chat_completions')).trim();

if (!apiKey) {
  console.error('错误: 未设置 AI_API_KEY 环境变量');
  console.error('用法: AI_API_KEY=your-api-key AI_BASE_URL=https://... node test-modelscope-api.js');
  process.exit(1);
}

const testCommits = [
  { hash: '3c305a8', subject: '添加 amd64-v3 优化版本构建支持', author: 'doumao', date: '2 hours ago', body: '', files: [] },
  { hash: '83c0819', subject: '添加代理检测提示和 sudo -E 使用说明', author: 'doumao', date: '3 hours ago', body: '', files: [] },
  { hash: '59d5b01', subject: '优先使用用户设置的代理，而不是加速镜像', author: 'doumao', date: '5 hours ago', body: '', files: [] },
  { hash: '43af80e', subject: '添加下载前代理和加速镜像提示', author: 'doumao', date: '6 hours ago', body: '', files: [] },
  { hash: 'f9b0ed1', subject: '修复下载进度条显示', author: 'doumao', date: '8 hours ago', body: '', files: [] },
];

function configuredModels() {
  const values = String(process.env.AI_MODEL || process.env.OPENAI_MODEL || process.env.MODELSCOPE_MODELS || '')
    .split(',').map(value => value.trim()).filter(Boolean);
  return values.length ? values : undefined;
}

async function selectModels() {
  const configured = configuredModels();
  if (generic) {
    if (configured) return configured;
    try {
      const availableModels = await fetchAIModels({ baseUrl, apiKey, requiresOpenAiAuth: true });
      const selected = availableModels.includes(DEFAULT_AI_MODEL) ? DEFAULT_AI_MODEL : availableModels[0];
      console.log(`AI 模型目录: ${availableModels.length}；选择: ${selected || '默认模型'}`);
      return selected ? [selected] : [DEFAULT_AI_MODEL];
    } catch {
      console.warn('AI 模型目录暂时不可用，将使用内置默认模型。');
      return [DEFAULT_AI_MODEL];
    }
  }
  try {
    const availableModels = await fetchModelScopeModels();
    const selection = resolveAvailableModelCandidates({
      modelCandidates: configured,
      availableModels,
      allowDiscoveredFallback: !configured,
    });
    console.log(`模型目录: ${availableModels.length}；候选: ${selection.candidates.length}；跳过: ${selection.skipped.length}；动态补充: ${selection.discovered.length}`);
    if (!selection.candidates.length) throw new Error('配置的候选模型均不在当前 ModelScope 目录中');
    return selection.candidates;
  } catch (error) {
    if (/均不在当前 ModelScope 目录/u.test(String(error?.message || ''))) throw error;
    console.warn('模型目录暂时不可用，将按配置或内置候选继续测试。');
    return configured;
  }
}

async function testModelScopeAPI() {
  console.log(`开始测试 AI 网关 API；提交样本: ${testCommits.length}`);
  const modelCandidates = await selectModels();
  // A dummy token should produce 401. A 403 here means the request may have
  // been blocked before account authentication; never send the real secret.
  const controlUrl = generic ? buildAIEndpoint(baseUrl, wireApi) : MODELSCOPE_CHAT_COMPLETIONS_URL;
  const controlBody = generic && wireApi.toLowerCase().replace(/[ -]/gu, '_') === 'responses'
    ? { model: modelCandidates?.[0], input: 'Reply OK.', max_output_tokens: 32, store: false }
    : { model: modelCandidates?.[0], messages: [{ role: 'user', content: 'Reply OK.' }], max_tokens: 32, enable_thinking: false };
  const control = await fetch(controlUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer invalid-diagnostic-token' },
    body: JSON.stringify(controlBody),
    signal: AbortSignal.timeout(15000),
  });
  console.log(`无效 Token 对照: HTTP=${control.status}；预期=401`);
  await control.body?.cancel();
  const result = await requestModelScopeSummary({
    apiKey,
    ...(baseUrl ? { baseUrl, wireApi } : {}),
    prompt: buildSummaryPrompt(testCommits),
    async fetchImpl(url, options) {
      const response = await fetch(url, options);
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const format = /json/iu.test(contentType) ? 'json' : /html/iu.test(contentType) ? 'html' : 'other';
        // Only a fixed label derived from the private body can leave this scope.
        const providerReason = providerFailureReason((await response.clone().text()).slice(0, 16000));
        console.error(`接口拒绝诊断: HTTP=${response.status}；format=${format}；providerReason=${providerReason}`);
      }
      return response;
    },
    ...(modelCandidates?.length ? { modelCandidates } : {}),
    logger: {
      log(message) { console.log(message); },
      error() { console.error('当前候选请求失败，继续尝试下一模型。'); },
      warn(message) { console.warn(message); },
    },
  });

  console.log(`API 调用成功；模型: ${result.modelName}`);
  console.log('生成的发布摘要:');
  console.log(result.summary);
  if (result.usage) {
    console.log(`Token: 输入=${result.usage.prompt_tokens ?? '未知'}；输出=${result.usage.completion_tokens ?? '未知'}；总计=${result.usage.total_tokens ?? '未知'}`);
  }
}

testModelScopeAPI().catch(error => {
  // Project fixed codes and numeric HTTP status only, never provider bodies.
  const attempts = publicModelAttempts(error?.attempts, process.env);
  attempts.forEach((attempt, index) => console.error(JSON.stringify({
    ...attempt,
    providerReason: providerFailureReason(error?.attempts?.[index]?.error),
  })));
  console.error('真实 AI 调用失败，请根据上述原因码检查 AI_API_KEY、AI_BASE_URL、AI_WIRE_API 和 AI_MODEL 配置。');
  process.exitCode = 1;
});
