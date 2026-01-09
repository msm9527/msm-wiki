# AI 自动分析提交记录 - 技术实现详解

## 概述

本功能使用 Claude AI 在 GitHub Actions 工作流中自动分析 Git 提交记录，生成简洁的版本发布总结。完全在云端运行，无需本地环境。

## 技术架构

### 运行环���

```
┌──────────────────────────────────────────────────────────┐
│  GitHub Actions Runner (Ubuntu 24.04)                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Node.js 环境                                       │  │
│  │  ├─ actions/github-script@v7                       │  │
│  │  ├─ Git 仓库（已 checkout）                         │  │
│  │  └─ 网络访问（可访问外部 API）                      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  环境变量:                                                │
│  └─ ANTHROPIC_API_KEY (从 GitHub Secrets 注入)          │
└──────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Anthropic API (api.anthropic.com)                       │
│  ├─ 接收提交记录                                          │
│  ├─ Claude 3.5 Sonnet 分析                               │
│  └─ 返回总结文本                                          │
└──────────────────────────────────────────────────────────┘
```

## 实现步骤

### 步骤 1: 获取提交记录

```javascript
const { execSync } = require('child_process');

// 执行 git log 命令获取最近 20 条提交
const commits = execSync('git log -20 --pretty=format:"%h|%s|%an|%ar"', {
  encoding: 'utf-8'
})
  .split('\n')
  .filter(line => line.trim())
  .map(line => {
    const [hash, subject, author, date] = line.split('|');
    return { hash, subject, author, date };
  });
```

**输出示例:**
```javascript
[
  {
    hash: "3c305a8",
    subject: "添加 amd64-v3 优化版本构建支持",
    author: "doumao",
    date: "2 hours ago"
  },
  {
    hash: "83c0819",
    subject: "添加代理检测提示和sudo -E使用说明",
    author: "doumao",
    date: "3 hours ago"
  },
  // ... 更多提交
]
```

### 步骤 2: 检查 API Key

```javascript
// 如果没有配置 API Key，使用默认总结
if (!process.env.ANTHROPIC_API_KEY) {
  console.log('未配置 ANTHROPIC_API_KEY，使用默认总结');
  const summary = `本次构建包含 ${commits.length} 个提交，主要更新：${commits[0].subject}`;
  core.setOutput('summary', summary);
  return;
}
```

**优点:**
- 即使没有 API Key，工作流也能正常运行
- 不会因为 API 问题导致构建失败

### 步骤 3: 调用 Anthropic API

```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `请分析以下 Git 提交记录，生成一个简洁的版本发布总结（3-5 个要点，每个要点不超过 20 字）。只输出要点列表，不要其他内容。

提交记录：
${commits.map(c => `- ${c.subject} (${c.author}, ${c.date})`).join('\n')}

要求：
1. 用中文输出
2. 提取主要功能变更、修复和优化
3. 每个要点以 "- " 开头
4. 合并相似的提交
5. 突出重要变更`
    }]
  })
});
```

**API 请求示例:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "请分析以下 Git 提交记录...\n\n提交记录：\n- 添加 amd64-v3 优化版本构建支持 (doumao, 2 hours ago)\n- 添加代理检测提示和sudo -E使用说明 (doumao, 3 hours ago)\n..."
    }
  ]
}
```

### 步骤 4: 处理 API 响应

```javascript
if (!response.ok) {
  throw new Error(`API 请求失败: ${response.status}`);
}

const data = await response.json();
const summary = data.content[0].text.trim();

console.log('AI 生成的总结:');
console.log(summary);

// 输出到工作流变量，供后续步骤使用
core.setOutput('summary', summary);
```

**API 响应示例:**
```json
{
  "id": "msg_01...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "- 添加 amd64-v3 优化版本构建支持\n- 优化代理检测和使用说明\n- 修复下载进度显示问题\n- 改进安装脚本用户体验"
    }
  ],
  "model": "claude-3-5-sonnet-20241022",
  "usage": {
    "input_tokens": 450,
    "output_tokens": 120
  }
}
```

### 步骤 5: 错误处理

```javascript
try {
  // API 调用代码
} catch (error) {
  console.error('AI 总结失败:', error.message);
  // 失败时使用默认总结
  const summary = `本次构建包含 ${commits.length} 个提交，主要更新：${commits[0].subject}`;
  core.setOutput('summary', summary);
}
```

**容错机制:**
- API 调用失败不会中断工作流
- 自动降级到默认总结
- 记录错误日志便于排查

## 远程仓库支持

### GitHub Actions 原生支持

✅ **完全支持** - 这是 GitHub Actions 的标准功能

**支持的仓库类型:**
- ✅ GitHub.com 公开仓库
- ✅ GitHub.com 私有仓库
- ✅ GitHub Enterprise Server
- ✅ GitHub Enterprise Cloud

**权限要求:**
- 仓库需要启用 GitHub Actions
- 需要有 Secrets 管理权限（添加 API Key）
- 工作流需要有 `contents: write` 权限（用于更新 Wiki）

### 其他 Git 平台

❌ **不支持** - 需要修改实现

如果你使用其他 Git 平台（GitLab、Gitea、Bitbucket 等），需要：

1. **GitLab CI/CD**
   ```yaml
   ai_summary:
     stage: prepare
     script:
       - node scripts/generate-summary.js
     variables:
       ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
   ```

2. **自建 CI/CD**
   - 需要支持 Node.js 环境
   - 需要网络访问 api.anthropic.com
   - 需要安全存储 API Key

## 配置指南

### 1. 获取 Anthropic API Key

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 注册或登录账号
3. 进入 API Keys 页面
4. 点击 "Create Key"
5. 复制生成的 API Key

**API Key 格式:**
```
sk-ant-api03-...
```

### 2. 添加到 GitHub Secrets

**方法 1: 通过 Web 界面**

1. 进入仓库页面
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret`
4. 填写信息:
   - Name: `ANTHROPIC_API_KEY`
   - Secret: 粘贴你的 API Key
5. 点击 `Add secret`

**方法 2: 通过 GitHub CLI**

```bash
# 安装 GitHub CLI
brew install gh  # macOS
# 或
sudo apt install gh  # Ubuntu

# 登录
gh auth login

# 添加 Secret
gh secret set ANTHROPIC_API_KEY
# 然后粘贴你的 API Key，按 Ctrl+D 确认
```

### 3. 验证配置

**手动触发工作流:**

```bash
# 方法 1: 通过 Web 界面
# Actions → 每日构建 MSM → Run workflow

# 方法 2: 通过 GitHub CLI
gh workflow run "每日构建 MSM"
```

**查看日志:**

```bash
# 查看最近的工作流运行
gh run list --workflow="每日构建 MSM"

# 查看特定运行的日志
gh run view <run-id> --log
```

**检查 AI 总结步骤:**

在工作流日志中查找:
```
Run 使用 AI 生成版本总结
AI 生成的总结:
- 添加 amd64-v3 优化版本构建支持
- 优化代理检测和使用说明
- 修复下载进度显示问题
```

## 成本分析

### Anthropic API 定价

**Claude 3.5 Sonnet (20241022):**
- 输入: $3.00 / 1M tokens
- 输出: $15.00 / 1M tokens

### 每次构建成本

**典型用量:**
- 输入: ~500 tokens (提交记录 + 提示词)
- 输出: ~150 tokens (总结文本)

**计算:**
```
输入成本: 500 tokens × $3.00 / 1,000,000 = $0.0015
输出成本: 150 tokens × $15.00 / 1,000,000 = $0.00225
总成本: $0.00375 ≈ $0.004 USD
```

### 月度成本估算

**每日构建场景:**
```
每日构建: 30 次/月
月度成本: 30 × $0.004 = $0.12 USD/月
年度成本: $0.12 × 12 = $1.44 USD/年
```

**高频构建场景:**
```
每次推送触发: 100 次/月
月度成本: 100 × $0.004 = $0.40 USD/月
年度成本: $0.40 × 12 = $4.80 USD/年
```

**结论:** 成本极低，完全可以接受。

## 安全考虑

### API Key 安全

✅ **安全措施:**
- API Key 存储在 GitHub Secrets（加密存储）
- 不会出现在日志中
- 不会出现在代码中
- 只有工作流运行时可访问

❌ **不要这样做:**
```yaml
# 错误：直接写在代码中
env:
  ANTHROPIC_API_KEY: sk-ant-api03-xxx  # 危险！
```

### 网络安全

✅ **安全连接:**
- 使用 HTTPS 加密通信
- Anthropic API 支持 TLS 1.2+
- GitHub Actions Runner 有防火墙保护

### 数据隐私

⚠️ **注意事项:**
- 提交记录会发送到 Anthropic API
- 如果提交信息包含敏感数据，需要谨慎使用
- 建议只在公开项目或内部项目使用

**解决方案:**
- 使用规范的提交信息（不包含敏感数据）
- 或者禁用 AI 总结功能（使用默认总结）

## 故障排查

### 问题 1: API 调用失败

**症状:**
```
AI 总结失败: API 请求失败: 401
```

**原因:**
- API Key 无效或过期
- API Key 未正确配置

**解决:**
1. 检查 API Key 是否正确
2. 重新生成 API Key
3. 更新 GitHub Secret

### 问题 2: 网络超时

**症状:**
```
AI 总结失败: fetch failed
```

**原因:**
- GitHub Actions Runner 网络问题
- Anthropic API 服务中断

**解决:**
1. 重新运行工作流
2. 检查 [Anthropic Status](https://status.anthropic.com/)
3. 如果持续失败，工作流会自动使用默认总结

### 问题 3: 额度不足

**症状:**
```
AI 总结失败: API 请求失败: 429
```

**原因:**
- API 额度用完
- 达到速率限制

**解决:**
1. 充值 Anthropic 账户
2. 等待速率限制重置
3. 工作流会自动降级到默认总结

## 高级用法

### 自定义提示词

编辑工作流文件中的提示词:

```javascript
content: `请分析以下 Git 提交记录，生成一个简洁的版本发布总结。

提交记录：
${commits.map(c => `- ${c.subject} (${c.author}, ${c.date})`).join('\n')}

要求：
1. 用中文输出
2. 分为三个部分：新增功能、问题修复、性能优化
3. 每个部分最多 3 个要点
4. 每个要点不超过 15 字
5. 使用 emoji 标记类型`
```

### 使用不同的模型

```javascript
body: JSON.stringify({
  model: 'claude-3-haiku-20240307',  // 更便宜的模型
  // 或
  model: 'claude-3-opus-20240229',   // 更强大的模型
  max_tokens: 1024,
  // ...
})
```

**模型对比:**

| 模型 | 输入价格 | 输出价格 | 适用场景 |
|------|---------|---------|---------|
| Haiku | $0.25/1M | $1.25/1M | 简单总结 |
| Sonnet | $3.00/1M | $15.00/1M | 标准总结（推荐） |
| Opus | $15.00/1M | $75.00/1M | 复杂分析 |

### 添加更多上下文

```javascript
// 获取文件变更统计
const stats = execSync('git diff --stat HEAD~20..HEAD', { encoding: 'utf-8' });

// 获取变更的文件列表
const files = execSync('git diff --name-only HEAD~20..HEAD', { encoding: 'utf-8' });

// 包含在提示词中
content: `请分析以下 Git 提交记录和文件变更...

提交记录：
${commits.map(c => `- ${c.subject}`).join('\n')}

变更统计：
${stats}

变更文件：
${files}
`
```

## 总结

### 优点

✅ **完全自动化** - 无需人工干预
✅ **成本极低** - 每月不到 $1
✅ **高度可靠** - 有容错机制
✅ **易于配置** - 只需添加一个 Secret
✅ **安全可靠** - API Key 加密存储
✅ **灵活可定制** - 可自定义提示词和模型

### 限制

❌ **需要 GitHub Actions** - 其他平台需要修改
❌ **需要网络访问** - 无法在离线环境使用
❌ **需要 API Key** - 需要 Anthropic 账户
❌ **有成本** - 虽然很低，但不是免费的

### 适用场景

✅ **适合:**
- 开源项目
- 内部项目
- 频繁发布的项目
- 需要专业发布说明的项目

❌ **不适合:**
- 包含敏感信息的提交
- 离线环境
- 预算极度受限的项目

## 相关资源

- [Anthropic API 文档](https://docs.anthropic.com/claude/reference/messages_post)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [actions/github-script 文档](https://github.com/actions/github-script)
- [GitHub Secrets 文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
