#!/usr/bin/env node

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildSummaryPrompt,
  fetchModelScopeModels,
  requestModelScopeSummary,
  resolveAvailableModelCandidates,
} = require('./scripts/ai-release-summary.cjs');

const apiKey = process.env.MODELSCOPE_API_KEY || '';

if (!apiKey) {
  console.error('错误: 未设置 MODELSCOPE_API_KEY 环境变量');
  console.error('用法: MODELSCOPE_API_KEY=your-api-key node test-modelscope-api.js');
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
  const values = String(process.env.MODELSCOPE_MODELS || '').split(',').map(value => value.trim()).filter(Boolean);
  return values.length ? values : undefined;
}

async function selectModels() {
  const configured = configuredModels();
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
  console.log(`开始测试 ModelScope API；提交样本: ${testCommits.length}`);
  const modelCandidates = await selectModels();
  const result = await requestModelScopeSummary({
    apiKey,
    prompt: buildSummaryPrompt(testCommits),
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
  console.error(`测试失败: ${error?.message || '未知错误'}`);
  process.exitCode = 1;
});
