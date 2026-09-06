# ModelScope API 配置指南

本文档说明如何配置和使用 ModelScope API（魔塔社区）进行 AI 自动总结。

## 为什么选择 ModelScope？

### 优势

✅ **有免费额度** - 具体取决于账号余额、免费额度和模型提供方
✅ **国内访问稳定** - 阿里云服务器，无需翻墙
✅ **响应速度快** - 国内网络延迟低
✅ **支持中文** - 通义千问专为中文优化
✅ **OpenAI 兼容** - API 格式兼容 OpenAI
✅ **强大的模型** - Qwen3-30B-A3B，并提供轻量级备选

### 对比

| 特性 | ModelScope (通义千问) | 智谱 AI (GLM-4) | Anthropic (Claude) |
|------|---------------------|----------------|-------------------|
| 访问稳定性 | ✅ 国内稳定 | ✅ 国内稳定 | ⚠️ 需要翻墙 |
| 价格 | ✅ 有免费额度 | ⚠️ 付费 | ❌ 较贵 |
| 中文能力 | ✅ 专为中文优化 | ✅ 专为中文优化 | ✅ 支持中文 |
| 响应速度 | ✅ 快（国内） | ✅ 快（国内） | ⚠️ 慢（国际） |
| API 兼容性 | ✅ OpenAI 兼容 | ✅ OpenAI 兼容 | ❌ 自有格式 |
| 模型能力 | ✅ 32B 参数 | ⚠️ 较小 | ✅ 强大 |

## 配置步骤

### 1. 获取 ModelScope API Key

#### 步骤 1: 注册 ModelScope 账号

1. 访问 [ModelScope 魔塔社区](https://www.modelscope.cn/)
2. 点击右上角"登录/注册"
3. 使用手机号或第三方账号注册

#### 步骤 2: 获取 Access Token

1. 登录后点击右上角头像
2. 进入 [个人中心 → Access Token](https://www.modelscope.cn/my/myaccesstoken)
3. 点击"创建新的 Token"
4. 输入 Token 名称（如：msm-release-bot）
5. 复制生成的 Access Token

**Access Token 格式:**
```
ms-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. 添加到 GitHub Secrets

#### 方法 1: 通过 Web 界面

1. 进入仓库页面
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret`
4. 填写信息:
   - Name: `MODELSCOPE_API_KEY`
   - Secret: 粘贴你的 Access Token
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
gh secret set MODELSCOPE_API_KEY
# 然后粘贴你的 Access Token，按 Ctrl+D 确认
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
const response = await fetch('https://api-inference.modelscope.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MODELSCOPE_API_KEY}`
  },
  body: JSON.stringify({
    model: 'Qwen/Qwen3-30B-A3B',
    messages: [
      {
        role: 'system',
        content: '你是一个专业的软件版本发布助手。'
      },
      {
        role: 'user',
        content: '你的提示词'
      }
    ],
    temperature: 0.7,
    max_tokens: 1024,
    stream: false
  })
});
```

### 响应格式

```json
{
  "id": "chatcmpl-xxxxxxxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "Qwen/Qwen3-30B-A3B",
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

ModelScope 提供多个开源模型，推荐使用：

| 模型 | 说明 | 参数量 | 适用场景 |
|------|------|--------|---------|
| Qwen/Qwen3-30B-A3B | 通义千问 3 MoE（当前首选） | 30B-A3B | 代码分析、技术文档 |
| Qwen/Qwen3-14B | 通义千问 3（轻量备选） | 14B | 通用总结、低配额 |
| Qwen/Qwen3-8B | 通义千问 3（快速备选） | 8B | 兜底生成 |
| Qwen/Qwen3-Coder-30B-A3B-Instruct | 通义千问 3 Coder | 30B-A3B | 代码变更分析 |

**当前工作流使用:** `Qwen/Qwen3-30B-A3B`，失败后依次切换到 `Qwen/Qwen3-14B`、`Qwen/Qwen3-8B`。

## 成本分析

### 配额说明

ModelScope 是否可调用取决于账号余额、免费额度和模型提供方状态。遇到 `429 insufficient balance` 时，工作流会自动尝试更轻量的备选模型；如果仍不可用，会使用本地规则生成完整摘要，不会退化成只显示第一条提交。

**对比其他服务:**

| API | 每次构建 | 每月（30次） | 每年 |
|-----|---------|------------|------|
| **ModelScope** | **视账号配额** | **视账号配额** | **视账号配额** |
| 智谱 AI | ¥0.0001 | ¥0.003 | ¥0.036 |
| 阿里云 | ¥0.004 | ¥0.12 | ¥1.44 |
| Anthropic | ¥0.027 | ¥0.81 | ¥9.72 |

**结论:** ModelScope 适合做自动摘要，但不能假设所有模型都永久免费或始终有可用提供方。

## 功能改进

### 1. 智能提交范围

**旧版本:**
- 只读取少量提交标题，容易遗漏功能

**新版本:**
- 自动检测上一个版本 tag
- 获取从上个版本到当前的所有提交
- 如果没有上一版源提交，降级到最近 100 条

**示例:**
```bash
# 如果存在 tag 0.7.4
git log 0.7.4..HEAD  # 获取从 0.7.4 到现在的所有提交

# 如果不存在上一版源提交
git log -100  # 获取最近 100 条
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
- Access Token 无效或过期
- Access Token 未正确配置

**解决:**
1. 检查 Access Token 是否正确
2. 确认 Access Token 已添加到 GitHub Secrets
3. 重新生成 Access Token

### 问题 2: API 调用失败 429

**症状:**
```
AI 总结失败: API 请求失败: 429 - Too Many Requests
```

**原因:**
- 达到速率限制

**解决:**
1. 等待速率限制重置（通常 1 分钟）
2. 工作流会自动使用默认总结

### 问题 3: 网络超时

**症状:**
```
AI 总结失败: fetch failed
```

**原因:**
- GitHub Actions Runner 网络问题
- ModelScope 服务中断

**解决:**
1. 重新运行工作流
2. 检查 [ModelScope 服务状态](https://www.modelscope.cn/)
3. 工作流会自动使用本地规则生成多分类摘要

### 问题 4: 未找到上一个版本

**症状:**
```
未找到上一个版本，使用最近 100 条提交
```

**原因:**
- 这是第一次构建
- Git 仓库没有 tag

**解决:**
- 这是正常行为，不需要处理
- 工作流会自动降级到最近 100 条提交，并继续生成结构化摘要

## 高级配置

### 切换模型

编辑工作流文件，修改模型名称:

```javascript
body: JSON.stringify({
  model: 'Qwen/Qwen3-30B-A3B',          // 当前工作流首选
  // 或
  model: 'Qwen/Qwen3-14B',              // 轻量备选
  // 或
  model: 'Qwen/Qwen3-8B',               // 快速兜底
  // ...
})
```

### 调整参数

```javascript
{
  model: 'Qwen/Qwen3-30B-A3B',
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
messages: [
  {
    role: 'system',
    content: '你是一个专业的软件版本发布助手，擅长分析 Git 提交记录并生成简洁的版本总结。'
  },
  {
    role: 'user',
    content: `请分析以下 Git 提交记录，生成一个简洁的版本发布总结。

提交记录（共 ${commits.length} 个）：
${commits.map(c => `- ${c.subject}`).join('\n')}

要求：
1. 用中文输出
2. 分为三个部分：新增功能、问题修复、性能优化
3. 每个部分最多 3 个要点
4. 每个要点不超过 15 字
5. 使用 emoji 标记类型`
  }
]
```

## 迁移指南

### 从其他 API 迁移

如果你之前使用其他 API，迁移步骤：

1. **获取 ModelScope Access Token**（见上文）

2. **添加新的 Secret**
   ```bash
   gh secret set MODELSCOPE_API_KEY
   ```

3. **删除旧的 Secret（可选）**
   ```bash
   gh secret delete ANTHROPIC_API_KEY
   # 或删除旧的无效模型配置
   gh secret delete ZHIPU_API_KEY
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

### Q: ModelScope API 真的免费吗？

A: 不能保证完全免费。是否能调用取决于账号余额、免费额度和模型提供方；工作流遇到 429 会切换轻量模型，全部失败时使用本地规则兜底。

### Q: 有使用限制吗？

A: 有速率限制，但对于每日构建场景完全够用。

### Q: 如何查看 API 使用情况？

A: 登录 [ModelScope 控制台](https://www.modelscope.cn/my/myaccesstoken)，查看 Token 使用情况。

### Q: 支持其他语言吗？

A: 支持。通义千问支持多语言，但中文效果最好。

### Q: 可以使用其他模型吗？

A: 可以。ModelScope 提供多个开源模型，可以根据需求选择。

### Q: Access Token 会过期吗？

A: 不会自动过期，但可以手动删除或重新生成。

## 相关链接

- [ModelScope 魔塔社区](https://www.modelscope.cn/)
- [API 文档](https://www.modelscope.cn/docs/model-service/API-Inference/intro)
- [Access Token 管理](https://www.modelscope.cn/my/myaccesstoken)
- [模型广场](https://www.modelscope.cn/models)
- [开发者社区](https://www.modelscope.cn/community)

## 支持

如有问题，请：

1. 查看工作流日志
2. 阅读本文档的故障排查部分
3. 访问 [ModelScope 社区](https://www.modelscope.cn/community)
4. 在 [GitHub Issues](https://github.com/msm9527/msm-wiki/issues) 提问

## 总结

### 为什么选择 ModelScope？

1. **有免费额度** - 适合每日构建，但需关注账号配额
2. **国内稳定** - 无需翻墙，访问速度快
3. **强大模型** - Qwen3-30B-A3B，另有 Qwen3-14B / Qwen3-8B 兜底
4. **中文优化** - 专为中文场景设计
5. **OpenAI 兼容** - API 格式标准，易于集成

### 成本对比总结

| API | 每月成本（30次） | 每年成本 | 相对 ModelScope |
|-----|----------------|---------|----------------|
| ModelScope | **¥0** | **¥0** | 基准 |
| 智谱 AI | ¥0.003 | ¥0.036 | - |
| 阿里云 | ¥0.12 | ¥1.44 | - |
| Anthropic | ¥0.81 | ¥9.72 | - |

**ModelScope 适合低成本自动总结，但不能假设所有模型始终免费可用。**
