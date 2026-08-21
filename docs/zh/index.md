---
layout: home

hero:
  name: "MSM"
  text: "家庭网络统一管理平台"
  tagline: 统一管理 MosDNS、Clash、Sing-Box、域名发布、远程组网与 Docker 资源
  actions:
    - theme: brand
      text: 快速上手
      link: /zh/guide/install
    - theme: alt
      text: 查看功能
      link: /zh/guide/basic-config

features:
  - title: MosDNS 双栈分流
    details: 管理 DNS 规则、客户端策略、查询日志以及 FakeIP IPv4 / IPv6 链路
    link: /zh/guide/mosdns
    linkText: DNS 教程
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="6" rx="2"/><circle cx="7" cy="6" r=".9" fill="currentColor" stroke="none"/><path d="M11 6h6M12 9v4M12 13l-5 4M12 13l5 4"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>'
  - title: 统一代理服务
    details: 在 Clash Meta、Clash Smart 与 Sing-Box 之间安全切换，使用同一套管理入口
    link: /zh/guide/proxy
    linkText: 代理教程
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5.4 3.7 10.5 8 12 4.3-1.5 8-6.6 8-12V5l-8-3Z"/><path d="M7.5 12h9M13 8.5l3.5 3.5-3.5 3.5"/></svg>'
  - title: 回家与私有组网
    details: 提供双核心多协议远程回家、Cloudflare 私网以及 EasyTier、Tailscale、WireGuard 自建私网
    link: /zh/guide/home
    linkText: 远程接入
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-7 9 7M5 10v10h14V10"/><path d="M8 15h8M10 12.5 7.5 15 10 17.5M14 12.5l2.5 2.5-2.5 2.5"/></svg>'
  - title: 域名发布闭环
    details: 集中完成 DDNS、HTTPS 证书、反向代理、健康检查与故障诊断
    link: /zh/guide/domain-services
    linkText: 域名服务
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="13" r="8"/><path d="M2 13h16M10 5c2.1 2.2 3.2 4.9 3.2 8S12.1 18.8 10 21c-2.1-2.2-3.2-4.9-3.2-8S7.9 7.2 10 5ZM16 3h5v5M21 3l-6 6"/></svg>'
  - title: Docker 管理
    details: 管理本机及独立子节点的容器、镜像、网络、存储卷和应用栈
    link: /zh/guide/docker-center
    linkText: Docker 管理
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="6" rx="1"/><rect x="13" y="4" width="8" height="6" rx="1"/><rect x="8" y="14" width="8" height="6" rx="1"/><path d="M7 10v2h10v-2M12 12v2M6 7h2M16 7h2M11 17h2"/></svg>'
  - title: 网络诊断工作台
    details: 集成 Ping、DNS、MTR、Traceroute、测速、端口扫描和局域网工具
    link: /zh/guide/network-tools
    linkText: 网络工具
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l2-5 4 10 3-7 2 2h5"/><circle cx="4" cy="18" r="2"/><path d="m5.5 19.5 2 2M16 4h5M18.5 1.5v5"/></svg>'
---

<nav class="msm-home-jump" aria-label="首页快速导航">
  <a href="#三步跑通基础链路">
    <strong>三步跑通</strong>
    <span>从安装到基础链路验收</span>
  </a>
  <a href="#按目标选择路径">
    <strong>按目标选路</strong>
    <span>远程访问与家庭服务器运维</span>
  </a>
  <a href="#接入你的主路由">
    <strong>接入主路由</strong>
    <span>四类路由器系统教程</span>
  </a>
  <a href="/zh/faq/troubleshooting">
    <strong>遇到问题</strong>
    <span>按现象进入故障排查</span>
  </a>
</nav>

## 一句话理解

MSM 从旁路由 DNS 与透明代理管理出发，现在把家庭网络常用的代理、域名发布、远程接入、Docker 运维和网络诊断放进了同一个 Web 管理平台。

基础旁路由链路仍然只需要三件事：安装 MSM、让主路由把 DNS 指向 MSM、再把实际启用的 FakeIP IPv4 / IPv6 网段路由回 MSM。

::: info 只提供管理能力
MSM 是闭源、面向用户自有或已授权环境的网络与系统管理软件。Clash 功能只负责管理用户自行提供且有权使用的内核与配置；项目不提供节点、订阅、网络接入、内容分发或其他违法违规服务，也不为未授权访问提供授权或背书。购买 Pro 只扩展软件管理能力，不包含任何节点或线路。使用前请阅读 [使用与合规中心](/zh/legal/)；购买说明见 [Pro 购买与授权](/zh/legal/pro-and-support)。
:::

## 三步跑通基础链路

这三步也是推荐的阅读顺序，照着做完就有一条可用的旁路由链路。

<div class="msm-steps">
<div class="msm-step">

### 安装并进入管理界面

- 从 [安装总览](/zh/guide/install) 选择你的平台
- 按 [首次使用](/zh/guide/first-use) 走完初始化向导
- 确认可以访问 `http://<MSM-IP>:7777`

</div>
<div class="msm-step">

### 完成主路由接入

- 对照 [路由器集成总览](/zh/guide/router-integration) 配置 DNS 与静态路由
- DHCP DNS 默认只下发 MSM 的 IPv4 地址
- 添加与 MSM 当前配置一致的 FakeIP IPv4 静态路由
- 启用 IPv6 时，再添加 FakeIP IPv6 静态路由

默认模板使用 `28.0.0.0/8` 和 `f2b0::/18`；如果你修改过网段，应以 MSM 页面中的实际配置为准。

</div>
<div class="msm-step">

### 回到 MSM 完成业务配置

- 在 [DNS 服务](/zh/guide/mosdns) 检查分流规则和 FakeIP 网段
- 在 [设备管理](/zh/guide/device-management) 配置需要代理的客户端
- 在 [代理服务](/zh/guide/proxy) 导入订阅、选择节点并确认策略组可用
- 分别验证 `A`、`AAAA` 查询与实际访问
- 需要更多能力时进入 [Pro 扩展功能](/zh/guide/basic-config#pro-扩展功能)

</div>
</div>

## 按目标选择路径

基础链路跑通之后，按你实际要做的事情选一条继续。

<div class="msm-goals">
<div class="msm-goal">

只从外网访问家庭 Web 服务

[域名服务](/zh/guide/domain-services) 或 [Cloudflare 网页穿透](/zh/guide/cloudflare)

</div>
<div class="msm-goal">

访问 SSH、远程桌面、数据库或多台内网设备

[Cloudflare 云端私网](/zh/guide/cloudflare) 或 [自建私网](/zh/guide/networking)

</div>
<div class="msm-goal">

已有公网 IP / DDNS，想用代理客户端回家

[远程回家](/zh/guide/home)

</div>
<div class="msm-goal">

统一管理本机与子节点的容器资源

[Docker 管理](/zh/guide/docker-center)

</div>
<div class="msm-goal">

排查 DNS、路由、端口、证书与链路质量

[网络工具](/zh/guide/network-tools)

</div>
<div class="msm-goal">

查看 MSM 各组件健康状态

[系统诊断](/zh/guide/diagnostics)

</div>
</div>

## 接入你的主路由

已提供专门教程的路由器系统：

<div class="msm-routers">
  <a class="msm-router" href="/zh/guide/routeros"><strong>RouterOS</strong><span>MikroTik</span></a>
  <a class="msm-router" href="/zh/guide/ikuai"><strong>爱快</strong><span>iKuai</span></a>
  <a class="msm-router" href="/zh/guide/openwrt"><strong>OpenWrt</strong><span>LEDE</span></a>
  <a class="msm-router" href="/zh/guide/unifi"><strong>UniFi</strong><span>Ubiquiti</span></a>
</div>

其他支持静态路由和自定义 DNS 的系统，也可以参考 [路由器集成总览](/zh/guide/router-integration) 按相同原则配置。

## 功能开关与 Pro 权限

域名服务、穿透与组网、Docker 管理和网络工具属于 Pro 扩展模块。入口是否显示由 **系统设置 → 功能开关** 控制；是否可以使用和执行高风险操作，还会同时检查 Pro 授权、当前用户角色及对应能力。

MSM 客户端中的“支持项目”按钮当前指向官方爱发电 Pro 商品页。它是付费授权入口，不是节点或订阅购买入口；价格、期限和交付以付款前商品页为准。详见[授权管理](/zh/guide/license#购买-pro)。

## 社区与资料

<div class="msm-links">
  <a class="msm-link" href="https://t.me/msm_home" target="_blank" rel="noreferrer">
    <span class="msm-link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></span>
    <span class="msm-link-body"><strong>Telegram 交流群</strong><span>t.me</span></span>
  </a>
  <a class="msm-link" href="https://t.me/msmwiki" target="_blank" rel="noreferrer">
    <span class="msm-link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></span>
    <span class="msm-link-body"><strong>Telegram 频道</strong><span>t.me</span></span>
  </a>
  <a class="msm-link" href="https://blog.847977.xyz/" target="_blank" rel="noreferrer">
    <span class="msm-link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/></svg></span>
    <span class="msm-link-body"><strong>Tom 佬的技术博客</strong><span>blog.847977.xyz</span></span>
  </a>
  <a class="msm-link" href="https://blog.847977.xyz/2025/10/30/%E4%BB%A5fakeip%E5%88%86%E6%B5%81%E4%B8%BA%E5%9F%BA%E7%9F%B3%E7%9A%84%E4%B8%80%E5%A5%97%E7%A7%91%E5%AD%A6%E6%96%B9%E6%A1%88/" target="_blank" rel="noreferrer">
    <span class="msm-link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg></span>
    <span class="msm-link-body"><strong>FakeIP 分流科学方案</strong><span>blog.847977.xyz</span></span>
  </a>
  <a class="msm-link" href="https://github.com/yyysuo/mosdns" target="_blank" rel="noreferrer">
    <span class="msm-link-icon"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg></span>
    <span class="msm-link-body"><strong>MosDNS 实践 · PH 佬</strong><span>github.com</span></span>
  </a>
  <a class="msm-link" href="https://github.com/herozmy/StoreHouse/tree/latest" target="_blank" rel="noreferrer">
    <span class="msm-link-icon"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg></span>
    <span class="msm-link-body"><strong>StoreHouse 脚本合集</strong><span>github.com</span></span>
  </a>
</div>

## 下一步

- [完整使用流程](/zh/guide/complete-workflow) - 从安装到验收串起来看
- [使用指南总览](/zh/guide/basic-config) - 对照后台菜单找功能
