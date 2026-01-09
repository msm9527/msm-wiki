# 智谱 AI GLM-4 API 配置指南

本文档说明如何配置和使用智谱 AI GLM-4 模型进行 AI 自动总结。

## 为什么选择智谱 AI GLM-4？

### 优势

✅ **国内访问稳定** - 智谱 AI 服务器，无需翻墙
✅ **价格极低** - GLM-4-Flash 模型价格最便宜
✅ **响应速度快** - 国内网络延迟低
✅ **支持中文** - GLM-4 专为中文优化
✅ **免费额度** - 新用户有免费试用额度
✅ **兼容 OpenAI** - API 格式兼容 OpenAI

### 对比

| 特性 | 智谱 AI (GLM-4) | Anthropic (Claude) | 阿里云 (通义千问) |
|------|----------------|-------------------|------------------|
| 访问稳定性 | ✅ 国内稳定 | ⚠️ 需要翻墙 | ✅ 国内稳定 |
| 价格 | ✅ 最便宜 | ❌ 较贵 | ⚠️ 中等 |
| 中文能力 | ✅ 专为中文优化 | ✅ 支持中文 | ✅ 专为中文优化 |
| 响应速度 | ✅ 快（国内） | ⚠️ 慢（国际） | ✅ 快（国内） |
| 免费额度 | ✅ 有 | ❌ 无 | ✅ 有 |
| API 兼容性 | ✅ OpenAI 兼容 | ❌ 自有格式 | ❌ 自有格式 |

## 配置步骤

### 1. 获取智谱 AI API Key

#### 步骤 1: 注册智谱 AI 账号

1. 访问 [智谱 AI 开放平台](https://open.bigmodel.cn/)
2. 点击"注册/登录"
3. 完成手机号验证

#### 步骤 2: 创建 API Key

1. 登录后进入 [API Keys 管理页面](https://open.bigmodel.cn/usercenter/apikeys)
2. 点击"创建新的 API Key"
3. 输入 API Key 名称（如：msm-release-bot）
4. 复制生成的 API Key

**API Key 格式:**
```
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxx
```

#### 步骤 3: 充值（可选）

新用户通常有免费额度，如果需要更多额度：

1. 进入 [充值页面](https://open.bigmodel.cn/usercenter/recharge)
2. 选择充值金额（最低 ¥10）
3. 完成支付

### 2. 添加到 GitHub Secrets

#### 方法 1: 通过 Web 界面

1. 进入仓库页面
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret`
4. 填写信息:
   - Name: `ZHIPU_API_KEY`
   - Secret: 粘贴你的 API Key
5. 点击 `Add secret`

#### 方法 2: 通过 GitHub CLI

```bash
# 安装 GitHub CLI
brew install gh  # macOS
# 或
sudo apt install gh  # Ubuntu

# 登录
gh auth login

# 添加 Secret
gh secret set ZHIPU_API_KEY
# 然后粘贴你的 API Key，按 Ctrl+D 确认
```

### 3. 验证配置

#### 手动触发工作流

```bash
# 方法 1: 通过 Web 界面
# Actions → 每日构建 MSM → Run workflow

# 方法 2: 通过 GitHub CLI
gh workflow run "每日构建 MSM"
```

#### 查看日志

```bash
# 查看最近的工作流运行
gh run list --workflow="每日构建 MSM"

# 查看特定运行的日志
gh run view <run-id> --log
```

#### 检查 AI 总结步骤

在工作流日志中查找:
```
Run 使用 AI 生成版本总结
获取从 0.7.4 到 HEAD 的所有提交（共 15 个）
实际获取到 15 个提交记录
AI 生成的总结:
- 登录页 UI 全面重构，优化用户体验
- 修复移动端动画效果问题
- 时区同步改为非阻塞，提升启动速度
使用的 tokens: 输入=520, 输出=145, 总计=665
```

## API 详细说明

### 请求格式

```javascript
const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ZHIPU_API_KEY}`
  },
  body: JSON.stringify({
    model: 'glm-4-flash',  // 模型名称
    messages: [{
      role: 'user',
      content: '你的提示词'
    }],
    temperature: 0.7,
    max_tokens: 1024
  })
});
```

### 响应格式

```json
{
  "id": "chatcmpl-xxxxxxxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "glm-4-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "- 添加 amd64-v3 优化版本构建支持\n- 优化代理检测和使用说明\n- 修复下载进度显示问题"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 520,
    "completion_tokens": 145,
    "total_tokens": 665
  }
}
```

### 支持的模型

| 模型 | 说明 | 输入价格 | 输出价格 | 适用场景 |
|------|------|---------|---------|---------|
| glm-4-flash | 快速模型（推荐） | ¥0.0001/1K | ¥0.0001/1K | 简单任务、高频调用 |
| glm-4 | 标准模型 | ¥0.05/1K | ¥0.05/1K | 标准总结 |
| glm-4-plus | 高级模型 | ¥0.05/1K | ¥0.05/1K | 复杂分析 |

**当前使用:** `glm-4-flash` - 价格最低，速度最快

## 成本分析

### 每次构建成本

**典型用量:**
- 输入: ~500 tokens (提交记录 + 提示词)
- 输出: ~150 tokens (总结文本)

**计算:**
```
输入成本: 500 tokens × ¥0.0001 / 1,000 = ¥0.00005
输出成本: 150 tokens × ¥0.0001 / 1,000 = ¥0.000015
总成本: ¥0.000065 ≈ ¥0.0001 人民币
```

### 月度成本估算

**每日构建场景:**
```
每日构建: 30 次/月
月度成本: 30 × ¥0.0001 = ¥0.003 人民币/月
年度成本: ¥0.003 × 12 = ¥0.036 人民币/年
```

**高频构建场景:**
```
每次推送触发: 100 次/月
月度成本: 100 × ¥0.0001 = ¥0.01 人民币/月
年度成本: ¥0.01 × 12 = ¥0.12 人民币/年
```

**结论:** 成本极低，几乎可以忽略不计！

### 与其他 API 对比

| 场景 | 智谱 AI (GLM-4-Flash) | 阿里云 (通义千问) | Anthropic (Claude) |
|------|---------------------|------------------|-------------------|
| 每次构建 | ¥0.0001 | ¥0.004 | ¥0.027 (约) |
| 每月（30次） | ¥0.003 | ¥0.12 | ¥0.81 |
| 每年 | ¥0.036 | ¥1.44 | ¥9.72 |
| **节省** | **基准** | **97.5%** | **99.6%** |

**智谱 AI 是最便宜的选择！**

## 功能改进

### 1. 智能提交范围

**旧版本:**
- 固定获取最近 20 条提交

**新版本:**
- 自动检测上一个版本 tag
- 获取从上个版本到当前的所有提交
- 如果没有 tag，降级到最近 20 条

**示例:**
```bash
# 如果存在 tag 0.7.4
git log 0.7.4..HEAD  # 获取从 0.7.4 到现在的所有提交

# 如果不存在 tag
git log -20  # 获取最近 20 条
```

### 2. 更详细的日志

**输出信息:**
```
找到上一个版本: 0.7.4
获取从 0.7.4 到 HEAD 的所有提交（共 15 个）
实际获取到 15 个提交记录
AI 生成的总结:
- 登录页 UI 全面重构，优化用户体验
- 修复移动端动画效果问题
- 时区同步改为非阻塞，提升启动速度
使用的 tokens: 输入=520, 输出=145, 总计=665
```

### 3. 更好的容错

**容错机制:**
1. 如果没有 API Key → 使用默认总结
2. 如果 API 调用失败 → 使用默认总结
3. 如果响应格式异常 → 使用默认总结

**默认总结格式:**
```
本次版本从 0.7.4 更新，包含 15 个提交，主要更新：登录页 UI 全面重构
```

## 故障排查

### 问题 1: API 调用失败 401

**症状:**
```
AI 总结失败: API 请求失败: 401 - Unauthorized
```

**原因:**
- API Key 无效或过期
- API Key 未正确配置

**解决:**
1. 检查 API Key 是否正确
2. 确认 API Key 已添加到 GitHub Secrets
3. 重新生成 API Key

### 问题 2: API 调用失败 429

**症状:**
```
AI 总结失败: API 请求失败: 429 - Too Many Requests
```

**原因:**
- 达到速率限制
- 账户余额不足

**解决:**
1. 等待速率限制重置（通常 1 分钟）
2. 检查账户余额
3. 充值账户

### 问题 3: 网络超时

**症状:**
```
AI 总结失败: fetch failed
```

**原因:**
- GitHub Actions Runner 网络问题
- 智谱 AI 服务中断

**解决:**
1. 重新运行工作流
2. 检查 [智谱 AI 服务状态](https://open.bigmodel.cn/)
3. 工作流会自动使用默认总结

### 问题 4: 未找到上一个版本

**症状:**
```
未找到上一个版本，使用最近 20 条提交
```

**原因:**
- 这是第一次构建
- Git 仓库没有 tag

**解决:**
- 这是正常行为，不需要处理
- 工作流会自动降级到最近 20 条提交

## 高级配置

### 切换模型

编辑工作流文件，修改模型名称:

```javascript
body: JSON.stringify({
  model: 'glm-4',        // 标准模型（更强大）
  // 或
  model: 'glm-4-plus',   // 高级模型（最强大）
  // ...
})
```

### 调整参数

```javascript
{
  model: 'glm-4-flash',
  messages: [...],
  temperature: 0.7,      // 创造性（0-1）
  top_p: 0.8,           // 采样概率
  max_tokens: 1024,     // 最大输出长度
  stream: false         // 是否流式输出
}
```

### 自定义提示词

编辑工作流文件中的提示词:

```javascript
content: `请分析以下 Git 提交记录，生成一个简洁的版本发布总结。

提交记录（共 ${commits.length} 个）：
${commits.map(c => `- ${c.subject}`).join('\n')}

要求：
1. 用中文输出
2. 分为三个部分：新增功能、问题修复、性能优化
3. 每个部分最多 3 个要点
4. 每个要点不超过 15 字
5. 使用 emoji 标记类型`
```

## 免费额度说明

### 新用户福利

智谱 AI 为新用户提供免费额度：

- **注册即送**: 通常有一定的免费 tokens
- **实名认证**: 额外赠送 tokens
- **首次充值**: 可能有充值优惠

### 免费额度使用

以 GLM-4-Flash 为例：

```
假设免费额度: 1,000,000 tokens
每次构建消耗: ~650 tokens
可用次数: 1,000,000 / 650 ≈ 1,538 次

按每日构建计算: 1,538 / 30 ≈ 51 个月
```

**结论:** 免费额度足够使用很长时间！

## 迁移指南

### 从 Anthropic 迁移

如果你之前使用 Anthropic API，迁移步骤：

1. **获取智谱 AI API Key**（见上文）

2. **添加新的 Secret**
   ```bash
   gh secret set ZHIPU_API_KEY
   ```

3. **删除旧的 Secret（可选）**
   ```bash
   gh secret delete ANTHROPIC_API_KEY
   ```

4. **推送更新的工作流**
   ```bash
   git push
   ```

5. **测试新配置**
   ```bash
   gh workflow run "每日构建 MSM"
   ```

### 兼容性

✅ **完全兼容** - 无需修改其他代码
✅ **输出格式相同** - Release 页面无需修改
✅ **容错机制相同** - 失败时自动降级
✅ **API 格式兼容 OpenAI** - 易于集成

## 常见问题

### Q: 是否需要删除其他 API Key？

A: 不需要。新版本使用 `ZHIPU_API_KEY`，不会影响旧的配置。

### Q: GLM-4-Flash 和 GLM-4 有什么区别？

A: GLM-4-Flash 是快速版本，价格更低，速度更快，适合简单任务。GLM-4 是标准版本，能力更强，适合复杂任务。

### Q: 智谱 AI 有免费额度吗？

A: 有。新用户注册和实名认证后通常有免费额度，具体以官网为准。

### Q: 如何查看 API 使用情况？

A: 登录 [智谱 AI 控制台](https://open.bigmodel.cn/usercenter/apikeys)，查看"用量统计"。

### Q: 支持其他语言吗？

A: 支持。GLM-4 支持多语言，但中文效果最好。

### Q: API 有速率限制吗？

A: 有。具体限制取决于你的账户等级，详见 [官方文档](https://open.bigmodel.cn/dev/api#rate-limit)。

## 相关链接

- [智谱 AI 开放平台](https://open.bigmodel.cn/)
- [GLM-4 API 文档](https://open.bigmodel.cn/dev/api)
- [API Keys 管理](https://open.bigmodel.cn/usercenter/apikeys)
- [用量统计](https://open.bigmodel.cn/usercenter/bill)
- [价格说明](https://open.bigmodel.cn/pricing)
- [开发者社区](https://open.bigmodel.cn/forum)

## 支持

如有问题，请：

1. 查看工作流日志
2. 阅读本文档的故障排查部分
3. 访问 [智谱 AI 开发者社区](https://open.bigmodel.cn/forum)
4. 在 [GitHub Issues](https://github.com/msm9527/msm-wiki/issues) 提问

## 总结

### 为什么选择智谱 AI？

1. **价格最低** - GLM-4-Flash 是所有选项中最便宜的
2. **国内稳定** - 无需翻墙，访问速度快
3. **免费额度** - 新用户有免费试用
4. **中文优化** - 专为中文场景设计
5. **OpenAI 兼容** - API 格式标准，易于集成

### 成本对比总结

| API | 每月成本（30次） | 每年成本 | 相对智谱 AI |
|-----|----------------|---------|------------|
| 智谱 AI (GLM-4-Flash) | ¥0.003 | ¥0.036 | 基准 |
| 阿里云 (通义千问) | ¥0.12 | ¥1.44 | 40倍 |
| Anthropic (Claude) | ¥0.81 | ¥9.72 | 270倍 |

**智谱 AI 是最经济实惠的选择！**
