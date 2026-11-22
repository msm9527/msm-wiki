---
pageClass: msm-release-page
description: MSM Assistant 浏览器助手独立发布页，提供 Google Chrome、Microsoft Edge 与 Mozilla Firefox 发行包下载及版本更新记录。
---

# 🧩 浏览器助手发布

<nav class="msm-release-channels" aria-label="发布通道">
  <a href="/zh/guide/releases.html">🚀 稳定版 <span>日常使用</span></a>
  <a href="/zh/guide/releases-beta.html">🧪 Beta 版 <span>抢先体验</span></a>
  <a href="/zh/guide/releases-assistant.html" aria-current="page">🧩 浏览器助手 <span>Chrome / Edge / Firefox</span></a>
</nav>

## 🧩 最新浏览器助手版本

<div class="msm-release-hero msm-release-hero--stable" data-version="assistant-v2.1.0" data-release-date="2026-11-22 CST" data-release-url="https://github.com/msm9527/msm-wiki/releases/tag/assistant-v2.1.0">
  <div class="msm-release-hero-copy">
    <h3 class="msm-release-version"><span>浏览器助手</span> <code>v2.1.0</code></h3>
  </div>
  <div class="msm-release-actions">
    <a class="msm-release-action msm-release-action--primary" href="https://github.com/msm9527/msm-wiki/releases/tag/assistant-v2.1.0" target="_blank" rel="noreferrer">下载此版本 <span aria-hidden="true">↗</span></a>
    <a class="msm-release-action" href="/zh/guide/assistant.html">安装与使用指南 <span aria-hidden="true">→</span></a>
  </div>
</div>
<div class="msm-release-metrics" aria-label="发布概览">
  <div class="msm-release-metric"><span>支持平台</span><strong>Chrome / Edge / Firefox</strong></div>
  <div class="msm-release-metric"><span>发布标签</span><strong>assistant-v2.1.0</strong></div>
  <div class="msm-release-metric"><span>发布日期</span><strong>2026-11-22</strong></div>
</div>

### 📦 三平台发行包直链 {#release-downloads}

| 浏览器平台 | 发行包 | 安装方式 |
| --- | --- | --- |
| **Google Chrome / Chromium** | [`msm-assistant-2.1.0-chrome.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/msm-assistant-2.1.0-chrome.zip) | 解压后在 `chrome://extensions` 开启开发者模式加载 |
| **Microsoft Edge** | [`msm-assistant-2.1.0-edge.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/msm-assistant-2.1.0-edge.zip) | 解压后在 `edge://extensions` 开启开发人员模式加载 |
| **Mozilla Firefox** | [`msm-assistant-2.1.0-firefox.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/msm-assistant-2.1.0-firefox.zip) | 在 `about:debugging#/runtime/this-firefox` 加载或签名安装 |
| **SHA256 校验文件** | [`SHA256SUMS`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.1.0/SHA256SUMS) | `shasum -a 256 -c SHA256SUMS` |

### 🎉 本次亮点 {#release-highlights}

<ol class="msm-release-highlights">
  <li class="msm-release-highlight">
    <span class="msm-release-highlight-index" aria-hidden="true">01</span>
    <p>全新无冲突分流策略引擎（[直] [代] [禁] [复] [清]）：切换策略自动清理 MosDNS 兄弟列表冲突并刷新缓存，支持一键恢复默认分流与当前域名 / 根域名作用域切换</p>
  </li>
  <li class="msm-release-highlight">
    <span class="msm-release-highlight-index" aria-hidden="true">02</span>
    <p>深度适配 Mihomo Smart 智能策略组：遵循配置顺序排列策略组、展示组图标与子策略组穿透延迟、固定态一键「恢复智能优选」及全组无截断并发测速</p>
  </li>
  <li class="msm-release-highlight">
    <span class="msm-release-highlight-index" aria-hidden="true">03</span>
    <p>旁路由实时连接安全防护与客户端过滤：筛选态自动切换「断开筛选连接」防止误断局域网其他设备，新增 LAN 客户端 IP 过滤与表头锁定的虚拟滚动列表</p>
  </li>
  <li class="msm-release-highlight">
    <span class="msm-release-highlight-index" aria-hidden="true">04</span>
    <p>双模规则工作台与实时流稳定性升级：新增「代理核心规则」只读视图（含规则类型、策略与命中次数）及多行原子批量写入；跨页面导航长连接不断流，预加载网页即开即看</p>
  </li>
  <li class="msm-release-highlight">
    <span class="msm-release-highlight-index" aria-hidden="true">05</span>
    <p>Popup 与 390px 侧边栏全功能闭环：补齐规则、历史、行内设置与 ⌘K 搜索，首屏零闪烁主题缓存、Top-Layer Popover 通知与长 IPv6 截断修复</p>
  </li>
</ol>

### 📋 完整更新 {#release-details}

<section class="msm-release-section msm-release-section--added">

### 🆕 新增功能 {#release-added}

- 新增无冲突 MosDNS 策略引擎与 `[复]` 一键重置按钮，并在域名详情与连接详情支持 `当前域名 / *.根域名` 作用域切换
- 新增规则管理「代理核心规则」视图（支持按规则类型、匹配内容、出站策略检索并显示 RuleSet 规模与命中次数）及 `/batch` 原子批量添加规则
- 新增 Mihomo `Smart` 智能组固定态标记与一键「恢复智能优选」（`DELETE /proxy/controller/proxies/:group`）
- 新增实时连接页局域网客户端 `srcIP` 筛选器、当前站点连接数徽标与「断开筛选连接」安全操作
- 新增预加载网页自动关联主域名与「重载网页完整采集」引导，Popup / Side Panel 补齐规则、历史、行内设置与 `⌘K` 命令面板
- 所有域名输入框与命令面板支持直接粘贴完整 URL 自动规范化主机名

</section>

<section class="msm-release-section msm-release-section--fixed">

### 🐛 问题修复与体验优化 {#release-fixed}

- 修复切换直连/代理/拦截时因 MosDNS 兄弟规则列表残留导致策略被更高优先级列表覆盖的问题，后台写操作升级为 FIFO 串行队列消除并发 `busy` 报错
- 修复跨页面导航时断开 `msm-stream` 长连接并丢失归档视图、以及重开弹窗瞬间出现虚假速率尖峰的问题
- 修复 DNS 监控 3 秒自动轮询导致刷新按钮持续禁用闪烁的问题，并修正上游健康度降级与异常状态文案
- 修复代理组按字母排序打乱配置顺序、规则模式下冗余显示 `GLOBAL`、隐藏组泄露及全组测速仅测前 16 个节点的问题
- 修复总览页长 IPv6 地址跨列溢出、390px 侧边栏导航标签右侧图标被裁切、状态浮层层级遮挡及弹窗遮盖 Toast 通知的问题
- 全量通过 38 项单元测试、Chrome / Edge 双平台 13 项 E2E 与明暗双主题 WCAG 2.1 AA 校验及 Firefox `addons-linter` 零错误校验

</section>

<section class="msm-release-section msm-release-section--notes">

### 📌 发布说明 {#release-notes}

- 浏览器助手在 `msm-wiki` 中使用独立的 `assistant-v*` 标签发布，不会覆盖 MSM 核心程序的 `Latest` 版本，也不会影响一键脚本和 MSM 后台在线更新。
- 详细安装与 API Token 配置步骤请参阅 [浏览器助手使用指南](/zh/guide/assistant)。

</section>

---

## 📚 历史版本

<details>
<summary><strong>v2.0.0</strong>（2026-11-22 · <code>assistant-v2.0.0</code>）— 首个三平台独立公开发行版</summary>

- 下载归档：[`msm-assistant-2.0.0-chrome.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.0.0/msm-assistant-2.0.0-chrome.zip) · [`msm-assistant-2.0.0-edge.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.0.0/msm-assistant-2.0.0-edge.zip) · [`msm-assistant-2.0.0-firefox.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.0.0/msm-assistant-2.0.0-firefox.zip) · [GitHub Release](https://github.com/msm9527/msm-wiki/releases/tag/assistant-v2.0.0)
- 全新 Precision Glass Console 设计，统一 Popup、Side Panel 与全屏工作台三端界面，支持浅色 / 深色主题与 `⌘K` 命令面板
- 引入 `runtime.connect` 长连接实时推送、代理控制面（模式切换 / 代理组测速切节点 / 实时连接）与 4 标签 MosDNS 监控工作台
- 正式提供 Google Chrome、Microsoft Edge 与 Mozilla Firefox 三平台独立构建与 `SHA256SUMS` 校验清单

</details>
