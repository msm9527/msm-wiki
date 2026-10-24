# AI 网关测试脚本使用说明

脚本文件名 `test-modelscope-api.js` 为历史路径，为避免旧工作流和链接失效暂时保留；实际调用使用通用 `AI_*` 配置，不再依赖 ModelScope。

## 安全说明

⚠️ **重要**: 请勿在代码中硬编码 API Key！

本测试脚本使用环境变量来提供 API Key，确保安全性。

## 使用方法

### 方法 1: 在当前终端安全读取

```bash
read -s -p "AI Bearer token: " AI_API_KEY
echo
export AI_API_KEY
export AI_BASE_URL="https://aiiii.ddsrem.in:998"
export AI_WIRE_API=responses
export AI_REQUIRES_OPENAI_AUTH=true
node test-modelscope-api.js
unset AI_API_KEY AI_BASE_URL AI_WIRE_API AI_REQUIRES_OPENAI_AUTH
```

输入内容不会显示在终端，也不会作为命令参数写入 shell 历史。

### 方法 2: 使用已配置的环境变量

```bash
node test-modelscope-api.js
```

## 准备 AI 网关配置

1. 准备一个兼容 OpenAI Responses API 的服务地址
2. 将地址写入 `AI_BASE_URL`，协议写入 `AI_WIRE_API=responses`
3. 将服务支持的模型 ID 写入 `AI_MODEL`（不确定时可留空）
4. 将 Bearer token 写入 `AI_API_KEY`，只保存到受保护的 Secret 或当前终端环境变量中

## 测试输出

成功运行后，你会看到：

```
开始测试 AI 网关；提交样本: 5
尝试使用模型: <configured-model>
API 调用成功；模型: <configured-model>
生成的发布摘要:
### ...
Token: 输入=...；输出=...；总计=...
```

该脚本复用正式发布日志的提示词、输出校验和降级逻辑，用于验证凭据、网络和当前模型。可以临时设置 `AI_MODEL` 指定模型；不设置时由网关目录或默认模型决定。

正式发布日志工作流采用以下语义：

- `AI_WIRE_API=responses` 请求 `${AI_BASE_URL}/responses`（裸地址会自动补 `/v1`），返回内容从 `output_text` 或 `output[].content[].text` 提取。
- `AI_MODEL` 非空时固定使用该模型；留空时尝试从网关模型目录选择候选。
- `AI_REQUIRES_OPENAI_AUTH=true` 时通过 `Authorization: Bearer` 发送 `AI_API_KEY`。
- 网关请求失败或输出不合格时使用本地规则摘要。

## 故障排查

### 错误: 未设置 AI_API_KEY 环境变量

**原因**: 没有提供 API Key

**解决**: 使用上述方法之一设置环境变量

### 错误: API 请求失败: 401

**原因**: API Key 无效或过期

**解决**:
1. 检查 `AI_API_KEY` 是否正确
2. 重新生成网关 token
3. 确认 `AI_BASE_URL`、`AI_WIRE_API` 和 `AI_MODEL` 已正确设置

### 错误: fetch failed

**原因**: 网络连接问题

**解决**:
1. 检查网络连接
2. 确认 GitHub runner 或当前终端可以访问 `AI_BASE_URL`
3. 稍后重试

## 安全最佳实践

1. ✅ **使用环境变量** - 不要硬编码 API Key
2. ✅ **避免命令历史** - 使用静默输入或 GitHub Actions Secret，不把密钥写进命令参数
3. ✅ **定期轮换** - 定期更换 API Key
4. ✅ **最小权限** - 只授予必要的权限
5. ✅ **监控使用** - 定期检查 API 使用情况

## 相关文档

- [AI 网关配置指南](MODELSCOPE_API_GUIDE.md)
- [Release 工作流优化指南](RELEASE_WORKFLOW_GUIDE.md)
