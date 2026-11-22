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

<div class="msm-release-hero msm-release-hero--stable" data-version="assistant-v2.0.0" data-release-date="2026-11-22 CST" data-release-url="https://github.com/msm9527/msm-wiki/releases/tag/assistant-v2.0.0">
  <div class="msm-release-hero-copy">
    <h3 class="msm-release-version"><span>浏览器助手</span> <code>v2.0.0</code></h3>
  </div>
  <div class="msm-release-actions">
    <a class="msm-release-action msm-release-action--primary" href="https://github.com/msm9527/msm-wiki/releases/tag/assistant-v2.0.0" target="_blank" rel="noreferrer">下载此版本 <span aria-hidden="true">↗</span></a>
    <a class="msm-release-action" href="/zh/guide/assistant.html">安装与使用指南 <span aria-hidden="true">→</span></a>
  </div>
</div>
<div class="msm-release-metrics" aria-label="发布概览">
  <div class="msm-release-metric"><span>支持平台</span><strong>Chrome / Edge / Firefox</strong></div>
  <div class="msm-release-metric"><span>发布标签</span><strong>assistant-v2.0.0</strong></div>
  <div class="msm-release-metric"><span>发布日期</span><strong>2026-11-22</strong></div>
</div>

### 📦 三平台发行包直链 {#release-downloads}

| 浏览器平台 | 发行包 | 安装方式 |
| --- | --- | --- |
| **Google Chrome / Chromium** | [`msm-assistant-2.0.0-chrome.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.0.0/msm-assistant-2.0.0-chrome.zip) | 解压后在 `chrome://extensions` 开启开发者模式加载 |
| **Microsoft Edge** | [`msm-assistant-2.0.0-edge.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.0.0/msm-assistant-2.0.0-edge.zip) | 解压后在 `edge://extensions` 开启开发人员模式加载 |
| **Mozilla Firefox** | [`msm-assistant-2.0.0-firefox.zip`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.0.0/msm-assistant-2.0.0-firefox.zip) | 在 `about:debugging#/runtime/this-firefox` 加载或签名安装 |
| **SHA256 校验文件** | [`SHA256SUMS`](https://github.com/msm9527/msm-wiki/releases/download/assistant-v2.0.0/SHA256SUMS) | `shasum -a 256 -c SHA256SUMS` |

### 🎉 本次亮点 {#release-highlights}

<ol class="msm-release-highlights">
  <li class="msm-release-highlight">
    <span class="msm-release-highlight-index" aria-hidden="true">01</span>
    <p>全新 Precision Glass Console 设计，统一 Popup 弹窗、Side Panel 侧边栏与全屏工作台三端体验，提供浅色 / 深色主题与 ⌘K 全局命令面板</p>
  </li>
  <li class="msm-release-highlight">
    <span class="msm-release-highlight-index" aria-hidden="true">02</span>
    <p>实时流式架构（runtime.connect）驱动吞吐、活跃连接、域名分流归因与工具栏动态徽标，告别低频轮询</p>
  </li>
  <li class="msm-release-highlight">
    <span class="msm-release-highlight-index" aria-hidden="true">03</span>
    <p>新增完整控制面：规则 / 全局 / 直连模式切换、Clash / Sing-Box 代理组测速与切节点、实时连接列表与一键断开</p>
  </li>
  <li class="msm-release-highlight">
    <span class="msm-release-highlight-index" aria-hidden="true">04</span>
    <p>深度对齐 MSM 后台重构 4 标签 MosDNS 监控工作台（实时查询日志、概览与排行、上游 DNS 统计、缓存分片与详情弹窗）</p>
  </li>
  <li class="msm-release-highlight">
    <span class="msm-release-highlight-index" aria-hidden="true">05</span>
    <p>正式提供 Google Chrome、Microsoft Edge 与 Mozilla Firefox 三平台独立构建包、SHA256SUMS 校验与双目标自动化端到端验证</p>
  </li>
</ol>

### 📋 完整更新 {#release-details}

<section class="msm-release-section msm-release-section--added">

### 🆕 新增功能 {#release-added}

- 新增代理节点页面，支持按策略组查看节点、批量/单节点延迟测速与一键切换
- 新增实时连接页面，支持按域名/规则/代理链路筛选、查看连接详情及断开连接
- 新增 4 标签 MosDNS 监控工作台：实时查询日志、概览与排行、上游 DNS 统计与缓存分片视图
- 新增全屏工作台 `⌘K` / `Ctrl+K` 命令面板与工具栏实时状态徽标
- 新增 Chrome、Edge 与 Firefox 三平台独立发行构建及 `SHA256SUMS` 校验清单

</section>

<section class="msm-release-section msm-release-section--fixed">

### 🐛 问题修复与体验优化 {#release-fixed}

- 修复 MosDNS 查询日志 `type`、`q`、`domain_mode` 筛选参数与 MSM 后端接口对齐问题
- 修复缓存命中率与懒命中率计算口径，支持亚毫秒（`< 1 ms`）DNS 耗时精确展示
- 修复热门查询域名超长文本重叠、宽屏/窄屏分栏表格裁切以及侧边栏徽标横向滚动条问题
- 修复 Microsoft Edge 158 扩展冷启动下网络请求监听竞态问题，全页面通过 WCAG 2.1 AA 无障碍检查

</section>

<section class="msm-release-section msm-release-section--notes">

### 📌 发布说明 {#release-notes}

- 浏览器助手在 `msm-wiki` 中使用独立的 `assistant-v*` 标签发布，不会覆盖 MSM 核心程序的 `Latest` 版本，也不会影响一键脚本和 MSM 后台在线更新。
- 详细安装与 API Token 配置步骤请参阅 [浏览器助手使用指南](/zh/guide/assistant)。

</section>

---

## 📚 历史版本

> `v2.0.0` 是首个在 MSM Wiki 独立公开发布的三平台版本；后续更新将持续归档在此处。
