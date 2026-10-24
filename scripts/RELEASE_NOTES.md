# 发布日志维护

稳定版、Beta 版与“发布日志预览（不构建、不发布）”共用 `generate-release-summary.cjs`。内容提取、模型链、提示词和输出校验由 `ai-release-summary.cjs` 维护；Wiki 排版和历史归档由 `update-release-page.cjs` 维护。

稳定版与 Beta 发布使用 `RELEASE_SUMMARY_MODE=ai`，通过兼容 OpenAI Responses API 的网关生成结构化摘要；AI 请求失败时自动保留完整的本地规则摘要，避免发布内容丢失。每日构建默认使用 `https://aiiii.ddsrem.in:998`、`responses` 和 `gpt-6.1-sol`，均可由 GitHub Variables 覆盖。

AI 预览与健康检查保留为手动诊断入口，要求真实 AI 成功；正式每日构建允许失败时规则回退。需要把正式构建也变成硬失败时，可在 workflow 中增加 `RELEASE_REQUIRE_AI=true`。

跨度过大的发布可以在 `scripts/release-briefs/` 中保存与“上一稳定版源 SHA-当前源 SHA”同名的 `.json` 事实提纲及历史 `.md` 编辑稿。只有两个提交都精确匹配时才读取；事实提纲约束 AI 的重点覆盖与禁止断言，历史编辑稿供维护者参考。

## AI 服务与密钥

- GitHub Actions Secret `AI_API_KEY`：仅保存 Bearer token，不在代码、日志或预览产物中写入。当前默认服务是兼容 OpenAI Responses API 的网关。
- Repository Variables（或兼容的 Secrets）`AI_BASE_URL`、`AI_WIRE_API`、`AI_MODEL` 和 `AI_REQUIRES_OPENAI_AUTH` 分别配置服务地址、协议（当前为 `responses`）、模型 ID 与是否发送 OpenAI Bearer Authorization。地址不含密钥；`AI_REQUIRES_OPENAI_AUTH` 设为 `true` 时必须配置 `AI_API_KEY`。
- 密钥在发送前清理首尾空白。401/403 等 HTTP 状态只以数字和固定原因码记录，不公开服务端原始响应。GitHub 不提供已有 Secret 的明文读取；凭据失效时须由账户持有人在仓库 Settings → Secrets and variables → Actions 更新。
- 使用 `responses` 协议时请求发送到 `${AI_BASE_URL}/v1/responses`（如果地址已经带 `/v1`，不会重复添加），正文使用 OpenAI Responses API 的 `instructions`、`input` 与 `max_output_tokens` 字段，返回内容从 `output_text` 或 `output[].content[].text` 提取。
- 配置 `AI_MODEL` 后每次使用该模型；留空时由工作流从服务的模型目录选择可用模型。模型目录不可用或没有有效候选时，仍会尝试服务默认模型（如果网关支持），否则降级规则摘要。
- API 超时、网络/DNS 异常、服务端 5xx、余额不足、模型不可用、输出截断或格式不合格会记录固定原因码并尝试下一个模型；全部失败则生成明确标记为“非 AI”的规则摘要，并在任务摘要中告警。
- 初稿通过检查后，默认由成功模型再做一轮对照证据的审稿，补漏、去重并纠正把既有功能说成新增的问题。审稿复用本次目录发现和初稿选中的模型，不重新请求目录，也不遍历另一条模型链；失败会保留已通过检查的初稿并告警，不会将失败结果覆盖正文。
- 模型存在可纠正的格式问题或未经证实的绝对化、量化宣传时，允许一次同模型纠错，仍不合格才降级；请求失败、截断或泄露凭据不适用该纠错。任务中分别记录初稿与审稿阶段的调用及安全原因码，不保存被拒绝的原始输出。

## 调整后如何验证

1. 运行 `npm test`、`npm run docs:build`，并用 actionlint 检查相关 workflow。
2. 先在 Actions 手动运行“AI 真实健康检查”，确认现有 Secret 能完成真实模型推理与摘要格式检查，再运行“发布日志预览（不构建、不发布）”。`source_ref` 填本次版本的源提交 SHA，`previous_commit` 填上一版源 SHA，选择对应通道。精确范围不合法或无成功 AI 结果时预览失败，但仍上传脱敏后的摘要与元数据供排查。
3. 检查任务摘要中的成功模型、回退状态、提交与采样计数，再阅读 `summary.md`。采样计数不代表模型已经完整覆盖每一项功能，应对照实际发布范围审阅。
4. 确认亮点不替代完整分类，重大功能有实现依据，兼容变化及必要升级操作没有遗漏。预览不会修改 GitHub Release、Wiki 或安装包。

## 内容与归档约定

- 上一版本 SHA 可用时，以两版净 Diff 为最高优先级证据，提交上下文采用 first-parent 发布线并受净变化约束；旁支说明只有在全部文件的前后 blob 与模式精确匹配净差异时才可补充。避免 squash 后再 merge 时把旧开发历史重新当作新增。任务中的提交数表示实际分析的发布线提交，不等于 Git 图中全部可达提交数。
- 输出只包含 `###` 分类标题与 Markdown 列表。亮点为 1–6 条，详项不按固定条数截断；空分类省略。
- 普通新增与“重磅功能”分开。不能从文件名、测试文件或提交中的宣传语推断“已验证”“彻底解决”或性能百分比。
- 当前页的 HTML 注释 `msm-release-data` 保存用于下一次归档的结构化数据。它不是私有数据，只包含页面已展示的发布内容。更新正文时应通过生成器同步，避免仅修改可见文案而留下旧归档数据。
- 新版本会归档前一版的全部分类；同版本重新生成只更新当前内容，不重复归档。旧 Markdown 标题与 VitePress 提示块也可读取。
- 审校样本位于 `test/fixtures/release-beta-1.4.1.md` 与 `release-stable-1.2.6.md`，用于检验复杂发布排版，以及不重复宣传历史功能。
