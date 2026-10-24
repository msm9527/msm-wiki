# AI 网关配置指南

文件名保留 `MODELSCOPE_API_GUIDE.md` 只是为了兼容已有链接；发布日志已经改为使用兼容 OpenAI Responses API 的网关，不再依赖 ModelScope。

## GitHub Actions 配置

在仓库 `Settings` → `Secrets and variables` → `Actions` 中配置：

| 类型 | 名称 | 示例 | 说明 |
| --- | --- | --- | --- |
| Secret | `AI_API_KEY` | `sk-…` | Bearer token，只放在 Secret |
| Variable（或 Secret） | `AI_BASE_URL` | `https://aiiii.ddsrem.in:998` | 网关地址，不包含 token |
| Variable（或 Secret） | `AI_WIRE_API` | `responses` | 当前使用 OpenAI Responses 协议 |
| Variable（或 Secret） | `AI_MODEL` | 网关支持的模型 ID | 可留空；工作流默认尝试 `gpt-6.1-sol` |
| Variable（或 Secret） | `AI_REQUIRES_OPENAI_AUTH` | `true` | 是否发送 `Authorization: Bearer` |

`AI_BASE_URL` 应填写到服务根路径。如果服务只提供 `/v1/responses`，可以将 `/v1` 一并写入地址，例如 `https://example.invalid/v1`；如果省略版本路径，脚本会自动补 `/v1`，最终请求路径为 `${AI_BASE_URL}/v1/responses`。非敏感配置推荐放 Variables；工作流也兼容放在 Secrets。

## 本地测试

不要把 token 写进代码、Shell 历史或提交。可在当前终端安全输入：

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

脚本文件名是历史路径，调用已经使用通用 `AI_*` 环境变量。设置 `AI_MODEL` 可以固定模型；留空时尝试读取网关 `/models` 或 `/v1/models`，再按返回结果选择模型，目录不可用时使用 `gpt-6.1-sol`。

## Responses API 请求

发布脚本向 `${AI_BASE_URL}/v1/responses`（或已带版本路径的 `${AI_BASE_URL}/responses`）发送 JSON：

```json
{
  "model": "<AI_MODEL>",
  "instructions": "你是严谨的中文发布编辑。",
  "input": "请根据代码证据生成发布日志。",
  "max_output_tokens": 8000
}
```

服务可以返回标准 Responses 对象中的 `output_text`，也可以返回 `output[].content[].text`；脚本会兼容这两种形式。网关返回 401/403/429、5xx、超时或不合格文本时，工作流生成本地规则摘要并记录固定原因码，不把服务端原始响应写入日志或发布产物。

## 故障排查

### 401 或 `API_KEY_REQUIRED`

确认 `AI_API_KEY` Secret 已创建且没有多余空格，`AI_REQUIRES_OPENAI_AUTH` 为 `true`，并确认网关要求 Bearer Authorization。GitHub 不提供已有 Secret 的明文读取，token 失效时只能重新设置。

### 404 或路由错误

确认 `AI_WIRE_API=responses`，并检查 `AI_BASE_URL` 是否需要包含 `/v1`。脚本会对没有版本路径的地址自动补 `/v1`，不会重复添加已有的 `/v1` 或 `/responses`。

### 模型错误

在 `AI_MODEL` 中填写网关实际支持的模型 ID。留空时脚本会尝试模型目录；目录不可用时由网关默认模型决定，若网关要求显式模型则必须填写。

### GitHub Actions 无法连接

GitHub runner 必须能访问 `AI_BASE_URL` 的公网 HTTPS 地址。写成 `localhost`、`127.0.0.1` 或仅在个人电脑可访问的内网地址，云端工作流都会失败。

## 安全要求

1. `AI_API_KEY` 只放 GitHub Secret，不放 Variables、YAML、代码、日志或文档。
2. 网关 token 使用最小权限并定期轮换。
3. 发生泄露时立即在网关侧撤销旧 token，再更新 GitHub Secret。
4. Pull Request 来自不可信分支时不要把 Secret 暴露给任意新增步骤。

## 相关文档

- [Release 工作流优化指南](RELEASE_WORKFLOW_GUIDE.md)
- [AI 网关测试脚本说明](TEST_API_README.md)
- [AI 总结技术实现](AI_SUMMARY_TECHNICAL_GUIDE.md)
