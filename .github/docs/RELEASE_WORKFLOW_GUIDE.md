# Release 工作流优化指南

本文档说明了每日构建工作流的优化功能和配置方法。

## 功能概览

### 1. AI 智能总结 ✨

工作流会自动收集上一版源提交到当前提交之间的完整变更，使用兼容 OpenAI Responses API 的 AI 网关生成结构化版本发布总结；AI 不可用时由本地规则生成同样的多分类摘要。

**特点：**
- 优先分析上一版源提交到当前提交的完整范围
- 同时读取提交正文、变更文件、diff 摘要和引用提交
- 输出“本次亮点 / 新增 / 变更 / 修复 / 备注”分类
- 每次发布保留多模块功能，不只取第一条提交
- 自动合并相似的提交
- `AI_WIRE_API=responses` 使用 Responses API 的 `instructions`、`input` 和 `max_output_tokens` 字段
- 可用 `AI_MODEL` 固定模型；留空时尝试从网关的模型目录选择候选
- `AI_BASE_URL` 只保存服务地址，`AI_API_KEY` 只保存 Bearer token，`AI_REQUIRES_OPENAI_AUTH` 控制是否发送 Authorization
- 目录请求失败时继续尝试服务默认模型，避免目录服务异常阻断可用的推理接口
- 所有模型失败时使用本地规则兜底，不丢失功能项

**示例输出：**
```
- 登录页 UI 全面重构，优化用户体验
- 修复移动端动画效果问题
- 时区同步改为非阻塞，提升启动速度
- Clash 规则编辑器交互优化
- 系统升级自动配置合并功能
```

### 2. Release UI 优化 🎨

优化后的 Release 页面包含：

**顶部信息：**
- 徽章展示（构建状态、版本号、平台）
- 居中对齐的标题和描述

**内容组织：**
- ✨ 本次更新（AI 生成的总结）
- 📋 构建信息表格
- 🎯 最新提交详情（折叠）
- 📝 近期更新记录（折叠）

**下载区域：**
- 🖥️ 命令行版本（按平台分类折叠）
  - Linux 平台（9 种架构）
  - macOS 平台（2 种架构）
- 🖼️ 桌面应用版本（折叠）
  - macOS DMG 文件

**安装指南：**
- 一键安装脚本
- 手动安装步骤
- Docker 安装命令

**底部链接：**
- 文档链接
- 项目徽章（GitHub、文档、Docker）

### 3. 自动更新 Wiki 📝

每次构建完成后，工作流会自动更新文档站点的版本发布页面。

**更新内容：**
- 新版本信息（版本号、发布日期）
- AI 生成的更新总结
- 构建信息（提交 SHA、作者、时间）
- GitHub Release 链接

**自动化流程：**
1. 读取现有的 `docs/zh/guide/releases.md`
2. 将旧的"最新版本"移至"历史版本"
3. 添加新版本到"最新版本"区域
4. 自动提交并推送到仓库

## 配置步骤

### 1. 配置 AI 网关

AI 总结功能使用一个兼容 OpenAI Responses API 的网关。将密钥放在 Secret，将地址和协议放在 Variables。

**步骤：**

1. 准备网关配置：
   - `AI_BASE_URL`：例如 `https://aiiii.ddsrem.in:998`；如果网关只提供 `/v1/responses`，填写带 `/v1` 的地址
   - `AI_WIRE_API`：填写 `responses`
   - `AI_MODEL`：网关支持的模型 ID；不确定时可先留空（工作流默认尝试 `gpt-6.1-sol`）
   - `AI_REQUIRES_OPENAI_AUTH`：填写 `true`

2. 添加到 GitHub Secrets：
   - 进入仓库 Settings → Secrets and variables → Actions
   - 点击 "New repository secret"
   - Name: `AI_API_KEY`
   - Value: 粘贴网关的 Bearer token
   - 点击 "Add secret"

3. 非敏感配置推荐在同一页面的 `Variables` 中新建 `AI_BASE_URL`、`AI_WIRE_API`、`AI_MODEL`、`AI_REQUIRES_OPENAI_AUTH`。如果已经误放在 `Secrets` 也能工作，工作流会优先读取 Secret；这些值不要包含 token 以外的额外内容。

**注意：**
- 如果不配置 `AI_API_KEY`，工作流会使用本地规则摘要（不会失败）
- 网关返回 401/403/429 或输出格式不符合发布日志要求时会自动降级规则摘要
- `AI_BASE_URL` 必须能被 GitHub Actions runner 访问；本地回环地址不能用于云端工作流
- 建议使用项目专用、可轮换的 token

### 2. 验证工作流权限

确保工作流有足够的权限：

1. 进入仓库 Settings → Actions → General
2. 在 "Workflow permissions" 部分：
   - 选择 "Read and write permissions"
   - 勾选 "Allow GitHub Actions to create and approve pull requests"
3. 点击 "Save"

### 3. 测试工作流

**手动触发测试：**

1. 进入仓库 Actions 页面
2. 选择 "每日构建 MSM" 工作流
3. 点击 "Run workflow"
4. 选择分支（默认 main）
5. 点击 "Run workflow" 确认

**检查结果：**

1. 查看工作流运行日志
2. 检查 AI 总结是否生成成功
3. 查看 Release 页面 UI 是否正确
4. 确认 Wiki 页面是否自动更新

## 工作流程

```
┌─────────────────┐
│  准备构建信息    │
│  - 读取版本号    │
│  - 获取提交记录  │
│  - 发现可用模型  │ ← 按网关配置
│  - AI 生成总结   │ ← 使用 OpenAI Responses 兼容网关
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  打包编译        │
│  - 多平台构建    │
│  - 生成产物      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  发布 Release    │
│  - 创建 tag      │
│  - 生成 Release  │ ← 优化的 UI
│  - 上传产物      │
│  - 更新 Wiki     │ ← 自动更新文档
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  构建 Docker     │
│  - 多架构镜像    │
│  - 推送到 Hub    │
└─────────────────┘
```

## 故障排查

### AI 总结失败

**症状：** Release 页面显示默认总结而不是 AI 生成的总结

**可能原因：**
1. 未配置 `AI_API_KEY`
2. token 无效或过期
3. `AI_BASE_URL`、`AI_WIRE_API` 或 `AI_MODEL` 配置错误
4. API 额度不足、模型没有可用提供方或当前账户无访问权限
5. 网关或 Responses 接口网络连接问题

**解决方法：**
1. 检查 `AI_API_KEY` Secret、`AI_BASE_URL` 和 `AI_WIRE_API` Variables 是否正确
2. 查看工作流日志中的模型状态、候选数量和固定错误码
3. 确认 `AI_MODEL` 是网关支持的模型；不确定时先留空让网关目录选择，或把工作流默认的 `gpt-6.1-sol` 改成服务支持的模型
4. 如果网关路径为 `/v1/responses`，确认 `AI_BASE_URL` 已包含 `/v1`
5. 检查账户额度、权限、限流和提供方状态
6. 如果全部模型不可用，确认页面是否已经生成“本次亮点”等本地兜底分类

### Wiki 更新失败

**症状：** Release 创建成功但 Wiki 页面未更新

**可能原因：**
1. 工作流权限不足
2. `releases.md` 文件格式不正确
3. Git 推送失败

**解决方法：**
1. 检查工作流权限设置
2. 确认 `docs/zh/guide/releases.md` 包含必要的标记：
   - `## 最新版本`
   - `## 历史版本`
3. 查看工作流日志中的错误信息

### Release UI 显示异常

**症状：** Release 页面格式混乱或内容缺失

**可能原因：**
1. Markdown 格式问题
2. 变量替换失败
3. 构建产物缺失

**解决方法：**
1. 检查工作流日志中的变量值
2. 验证所有构建产物是否正确生成
3. 查看 Release 页面的原始 Markdown

## 自定义配置

### 配置模型

在仓库 `Settings` → `Secrets and variables` → `Actions` → `Variables` 中设置 `AI_MODEL`。当前实现以一个模型 ID 作为首选；留空时由网关模型目录选择，工作流未发现可用目录时使用 `gpt-6.1-sol`。

一次发布日志生成会复用初稿选中的模型进行审稿，不把 token 或服务端原始错误写入任务摘要。

### 修改 AI 提示词

编辑 `scripts/ai-release-summary.cjs` 中的 AI 提示词和本地兜底规则：

```yaml
content: `请分析以下 Git 提交记录，生成一个简洁的版本发布总结（3-5 个要点，每个要点不超过 20 字）。只输出要点列表，不要其他内容。

提交记录：
${commits.map(c => `- ${c.subject} (${c.author}, ${c.date})`).join('\n')}

要求：
1. 用中文输出
2. 提取主要功能变更、修复和优化
3. 每个要点以 "- " 开头
4. 合并相似的提交
5. 突出重要变更`
```

### 修改 Release 模板

编辑 `.github/workflows/daily-build-msm.yml` 中的 `body` 部分来自定义 Release 页面内容。

### 修改 Wiki 更新逻辑

编辑 `.github/workflows/daily-build-msm.yml` 中的 "更新 Wiki 版本发布页面" 步骤。

## 成本估算

### AI 网关配额与成本

工作流使用 `AI_MODEL` 指定的模型；模型目录成员资格只表示服务当前声明该模型，实际可用性仍取决于网关账户余额、额度、访问权限和提供方状态。成本和限流策略由网关服务提供方决定：

- 输入：约 500 tokens（提交记录）
- 输出：约 200 tokens（总结）
- 每次构建成本：约 $0.003 USD

**每月成本估算：** 请以网关服务商的用量页面为准。

## 最佳实践

1. **定期检查 API 额度**
   - 监控 AI 网关账户额度和模型状态
   - 设置低额度告警

2. **优化提交信息**
   - 使用清晰的提交信息
   - 遵循 Conventional Commits 规范
   - AI 会生成更准确的总结

3. **保持 Wiki 格式一致**
   - 不要手动修改自动生成的部分
   - 保持标记完整性

4. **监控工作流运行**
   - 定期查看工作流日志
   - 及时处理失败情况

## 相关链接

- [OpenAI Responses API 文档](https://platform.openai.com/docs/api-reference/responses)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [MSM 项目文档](https://doc.msmbox.net/)

## 支持

如有问题，请：

1. 查看工作流日志
2. 阅读本文档的故障排查部分
3. 在 [GitHub Issues](https://github.com/msm9527/msm-wiki/issues) 提问
