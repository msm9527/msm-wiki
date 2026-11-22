---
description: MSM Assistant 浏览器扩展安装指南与使用说明，支持 Google Chrome、Microsoft Edge 与 Mozilla Firefox。
---

# 浏览器助手（MSM Assistant）

**MSM Assistant** 是面向 MSM 自托管平台的官方浏览器扩展，支持 **Google Chrome**、**Microsoft Edge** 与 **Mozilla Firefox**。它让你在日常浏览网页的同时，实时洞察当前标签页的域名请求、分流归因与 DNS 解析状态，并一键完成无冲突策略切换、代理节点控制、核心规则检索与 MosDNS 监控。

::: info 只提供管理能力与本地观测
MSM Assistant 仅连接你自有或已获授权的 MSM 实例，所有请求捕获仅在本地浏览器内存中保存，不向任何第三方发送遥测数据。扩展本身不提供代理节点、订阅或网络接入服务；使用前请阅读 [使用与合规中心](/zh/legal/)。
:::

## 下载与最新版本

当前最新版本：**`v2.1.0`**（独立发布标签：`assistant-v2.1.0`）

| 浏览器平台 | 下载发行包 | 说明 |
| --- | --- | --- |
| **Google Chrome / Chromium** | [msm-assistant-2.1.0-chrome.zip](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/msm-assistant-2.1.0-chrome.zip) | Chrome / Brave / Arc / Vivaldi 等 Chromium 内核浏览器（支持 Side Panel） |
| **Microsoft Edge** | [msm-assistant-2.1.0-edge.zip](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/msm-assistant-2.1.0-edge.zip) | Microsoft Edge 桌面端（已通过 Edge 实机与端到端验证） |
| **Mozilla Firefox** | [msm-assistant-2.1.0-firefox.zip](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/msm-assistant-2.1.0-firefox.zip) | Firefox 140+（通过 `addons-linter` 零错误校验，支持 Sidebar） |
| **校验清单** | [SHA256SUMS](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/SHA256SUMS) | 用于验证压缩包完整性：`shasum -a 256 -c SHA256SUMS` |

完整更新内容与历史发行记录见 [浏览器助手发布页](/zh/guide/releases-assistant) 与 [GitHub Release（assistant-v2.1.0）](https://github.com/msm9527/msm-wiki/releases/tag/assistant-v2.1.0)。

## 界面预览

### 弹窗（Popup）与侧边栏（Side Panel）

点击工具栏图标即可打开紧凑高密度弹窗，预加载网页无需刷新即可关联主域名，内置 `站点 / 请求 / 节点 / 连接 / DNS / 规则` 标签页与行内历史、设置及 `⌘K` 搜索；在 Chrome / Edge 中可一键切入常驻侧边栏（Firefox 使用原生 Sidebar）。

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin: 16px 0;">
  <figure style="margin: 0;">
    <img src="/images/assistant/popup.png" alt="MSM Assistant 弹窗界面" />
    <figcaption style="text-align: center; font-size: 13px; opacity: 0.75; margin-top: 6px;">工具栏弹窗（Popup）</figcaption>
  </figure>
  <figure style="margin: 0;">
    <img src="/images/assistant/sidepanel.png" alt="MSM Assistant 侧边栏界面" />
    <figcaption style="text-align: center; font-size: 13px; opacity: 0.75; margin-top: 6px;">常驻侧边栏（Side Panel）</figcaption>
  </figure>
</div>

### 全屏工作台（Workspace · 浅色 / 深色）

点击右上角展开图标进入全屏工作台，支持实时吞吐趋势、请求瀑布流、域名诊断、Smart 代理组控制、实时连接筛选管理、4 标签 MosDNS 监控、双模规则工作台与 `⌘K` / `Ctrl+K` 全局命令面板。

<div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin: 16px 0;">
  <figure style="margin: 0;">
    <img src="/images/assistant/workspace.png" alt="MSM Assistant 全屏工作台（浅色模式）" />
    <figcaption style="text-align: center; font-size: 13px; opacity: 0.75; margin-top: 6px;">全屏工作台（浅色模式）</figcaption>
  </figure>
  <figure style="margin: 0;">
    <img src="/images/assistant/workspace-dark.png" alt="MSM Assistant 全屏工作台（深色模式）" />
    <figcaption style="text-align: center; font-size: 13px; opacity: 0.75; margin-top: 6px;">全屏工作台（深色模式）</figcaption>
  </figure>
</div>

## 安装步骤

### Google Chrome / Chromium 浏览器

1. 下载并解压 [`msm-assistant-2.1.0-chrome.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/msm-assistant-2.1.0-chrome.zip) 到一个不会误删的本地目录。
2. 打开 `chrome://extensions`，开启右上角 **开发者模式**。
3. 点击 **加载已解压的扩展程序**，选择解压后的文件夹。
4. 建议在扩展栏将 **MSM Assistant** 固定（Pin）到工具栏，方便随时查看徽标与一键操作。

### Microsoft Edge

1. 下载并解压 [`msm-assistant-2.1.0-edge.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/msm-assistant-2.1.0-edge.zip) 到本地固定目录。
2. 打开 `edge://extensions`，开启左下角 **开发人员模式**。
3. 点击 **加载解压缩的扩展**，选择解压后的目录完成安装。

### Mozilla Firefox

1. 下载 [`msm-assistant-2.1.0-firefox.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/msm-assistant-2.1.0-firefox.zip) 并解压（临时测试也可直接选择 ZIP 内的 `manifest.json`）。
2. 打开 `about:debugging#/runtime/this-firefox`，点击 **临时载入附加组件...**，选择解压目录中的 `manifest.json`。
3. 如需在标准版 Firefox 中长期保留安装，请使用 Mozilla AMO 签名（`web-ext sign`）后通过 `.xpi` 安装，或在 Firefox Developer Edition / Nightly 中使用。

## 连接 MSM 服务

安装扩展后，打开扩展的 **设置** 页面填写以下两项信息即可完成接入：

1. **MSM 服务地址**：填写你的 MSM 后台访问地址，例如 `http://192.168.1.2:7777` 或反代后的 `https://msm.example.com`。
2. **API Token**：
   - 登录 MSM 后台，前往 **系统设置 → 系统管理 → API Token** 创建访问令牌（详情见 [API 参考](/zh/guide/api)）。
   - 将生成的 Token 粘贴到扩展设置中，点击 **测试连接** 确认连通，最后点击 **保存**。

::: tip 权限说明
扩展仅在用户配置服务器地址并主动保存后，通过浏览器可选主机权限向你填写的 MSM 地址发起 API 请求；所有凭据保存在浏览器本地扩展存储中。
:::

## 核心功能一览

- **当前站点与请求流观测**：按标签页实时捕获资源请求、状态码、耗时瀑布流与异常统计；已加载网页无需刷新即可自动关联主域名，支持一键重载采集与离线导出会话快照。
- **无冲突域名策略引擎（`[直] [代] [禁] [复] [清]`）**：结合自定义 MosDNS 规则、实时连接与 DNS 日志呈现分流归因；切换策略时自动清理兄弟列表冲突并刷新缓存，支持一键 **`[复]`** 恢复默认与 `当前域名 / *.根域名` 作用域切换，所有域名输入框均支持直接粘贴完整 URL。
- **代理控制面与 Smart 智能组**：切换全局模式（规则 / 全局 / 直连），按配置顺序展示 Clash / Mihomo / Sing-Box 代理组、策略组图标与子策略组穿透延迟，支持全组并发测速及 Mihomo `Smart` 固定态一键「恢复智能优选」。
- **旁路由实时连接管理**：实时查看活跃/已关闭连接、命中规则与上下行流量，支持局域网客户端 IP 过滤、当前站点连接计数筛选与表头锁定虚拟滚动；筛选态自动切换为 **「断开筛选连接」**，避免误断全网其他设备流量。
- **MosDNS 监控工作台（4 标签视图）**：
  - **实时查询日志**：静默轮询不闪烁，支持记录类型、规则集与响应码筛选、模糊/精确域名检索与完整应答详情弹窗。
  - **概览与排行**：实时 QPS、缓存命中率、亚毫秒响应耗时、分流规则分布与热门查询域名排行。
  - **上游 DNS 统计**：按请求量、采纳率、出错率与延迟观测上游健康度。
  - **缓存分片**：逐分片查看条目数与命中率，支持按域名或分片清理缓存。
- **双模规则工作台**：在同一视图内切换管理 **MosDNS 分流列表**（支持 `/batch` 多行原子批量写入与一键清缓存）与 **代理核心规则**（展示规则类型、匹配内容、出站策略与命中次数）。
- **快捷操作与命令面板**：Popup、侧边栏与全屏工作台统一支持 `⌘K`（macOS）或 `Ctrl+K`（Windows/Linux）快速跳转页面、粘贴 URL 诊断域名或切换代理模式。

## 下一步

- [浏览器助手版本发布](/zh/guide/releases-assistant) - 查看发行包与版本更新记录
- [API 参考](/zh/guide/api) - 了解 MSM API Token 创建与权限范围
- [DNS 服务（MosDNS）](/zh/guide/mosdns) - 深入了解分流规则与缓存配置
- [统一代理服务](/zh/guide/proxy) - 了解 Clash 与 Sing-Box 策略组管理
