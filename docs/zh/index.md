---
layout: home

hero:
  name: "MSM"
  text: "家庭网络服务，一处管理"
  tagline: 统一管理 MosDNS、Clash、Sing-Box、域名发布、远程组网与 Docker 资源
  image:
    src: /logo/logo-square.svg
    alt: MSM Logo
  actions:
    - theme: brand
      text: 开始安装
      link: /zh/guide/install
    - theme: alt
      text: 浏览功能
      link: /zh/guide/basic-config

features:
  - icon:
      src: /icons/home/dns.svg
      alt: DNS 分流
      width: 28
      height: 28
      wrap: true
    title: MosDNS 双栈分流
    details: 管理 DNS 规则、客户端策略、查询日志以及 FakeIP IPv4 / IPv6 链路
    link: /zh/guide/mosdns
    linkText: 了解 DNS 服务
  - icon:
      src: /icons/home/proxy.svg
      alt: 代理核心切换
      width: 28
      height: 28
      wrap: true
    title: 统一代理服务
    details: 在 Clash Meta、Clash Smart 与 Sing-Box 之间安全切换，使用同一套管理入口
    link: /zh/guide/proxy
    linkText: 查看代理管理
  - icon:
      src: /icons/home/remote.svg
      alt: 远程访问
      width: 28
      height: 28
      wrap: true
    title: 回家与私有组网
    details: 管理远程回家、Cloudflare 私网以及 EasyTier、Tailscale、WireGuard 自建私网
    link: /zh/guide/home
    linkText: 配置远程访问
  - icon:
      src: /icons/home/domain.svg
      alt: 域名服务
      width: 28
      height: 28
      wrap: true
    title: 域名发布闭环
    details: 集中完成 DDNS、HTTPS 证书、反向代理、健康检查与故障诊断
    link: /zh/guide/domain-services
    linkText: 了解域名服务
  - icon:
      src: /icons/home/docker.svg
      alt: Docker 资源
      width: 28
      height: 28
      wrap: true
    title: Docker 管理
    details: 管理本机及独立子节点的容器、镜像、网络、存储卷和应用栈
    link: /zh/guide/docker-center
    linkText: 进入 Docker 指南
  - icon:
      src: /icons/home/tools.svg
      alt: 网络诊断
      width: 28
      height: 28
      wrap: true
    title: 网络诊断工作台
    details: 集成 Ping、DNS、MTR、Traceroute、测速、端口扫描和局域网工具
    link: /zh/guide/network-tools
    linkText: 查看诊断工具
---

<section class="msm-home-section" aria-labelledby="msm-quick-start">
  <div class="msm-section-heading">
    <h2 id="msm-quick-start">三步跑通基础链路</h2>
    <p>先完成最小可用配置，再按需打开高级模块，不必一开始理解全部功能。</p>
  </div>
  <div class="msm-step-list">
    <a class="msm-step" href="/zh/guide/install">
      <span class="msm-step__number" aria-hidden="true">1</span>
      <h3>安装并初始化</h3>
      <p>选择系统对应的安装方式，启动 MSM，并完成首次配置向导。</p>
      <span class="msm-home-link">查看安装说明</span>
    </a>
    <a class="msm-step" href="/zh/guide/router-integration">
      <span class="msm-step__number" aria-hidden="true">2</span>
      <h3>接入主路由</h3>
      <p>将客户端 DNS 指向 MSM，并添加与实际配置一致的 FakeIP 静态路由。</p>
      <span class="msm-home-link">选择路由器教程</span>
    </a>
    <a class="msm-step" href="/zh/guide/complete-workflow">
      <span class="msm-step__number" aria-hidden="true">3</span>
      <h3>配置并验证</h3>
      <p>检查 DNS 分流、导入合法配置，并分别验证解析、路由和实际访问。</p>
      <span class="msm-home-link">完成整体验收</span>
    </a>
  </div>
</section>

<section class="msm-home-section" aria-labelledby="msm-use-paths">
  <div class="msm-section-heading">
    <h2 id="msm-use-paths">按目标选择使用路径</h2>
    <p>从你现在要解决的问题出发，直接进入对应流程。</p>
  </div>
  <div class="msm-path-grid">
    <a class="msm-path msm-path--primary" href="/zh/guide/router-integration">
      <div>
        <h3>搭建旁路由与透明代理</h3>
        <p>从 DNS、FakeIP 静态路由到代理核心配置，把基础链路按顺序连通，并保留清晰的诊断入口。</p>
      </div>
      <span class="msm-home-link">从路由器接入开始</span>
    </a>
    <a class="msm-path" href="/zh/guide/home">
      <div>
        <h3>从外网访问家庭网络</h3>
        <p>根据 Web 服务、私网访问或代理客户端场景选择合适的回家方式。</p>
      </div>
      <span class="msm-home-link">查看远程回家</span>
    </a>
    <a class="msm-path" href="/zh/guide/docker-center">
      <div>
        <h3>统一维护家庭服务器</h3>
        <p>集中管理 Docker 资源，并用网络工具和系统诊断定位链路问题。</p>
      </div>
      <span class="msm-home-link">查看 Docker 管理</span>
    </a>
  </div>
</section>

<section class="msm-home-section" aria-labelledby="msm-reading-order">
  <div class="msm-section-heading">
    <h2 id="msm-reading-order">推荐阅读</h2>
    <p>新用户先完成基础链路；已有环境可直接查找对应功能。</p>
  </div>
  <div class="msm-reading-grid">
    <a class="msm-reading-link" href="/zh/guide/first-use">
      <strong>首次使用</strong>
      <span>完成初始化和基础设置</span>
    </a>
    <a class="msm-reading-link" href="/zh/guide/mosdns">
      <strong>DNS 服务</strong>
      <span>配置分流、客户端和日志</span>
    </a>
    <a class="msm-reading-link" href="/zh/guide/proxy">
      <strong>代理服务</strong>
      <span>选择核心并管理配置</span>
    </a>
    <a class="msm-reading-link" href="/zh/faq/troubleshooting">
      <strong>故障排查</strong>
      <span>按现象定位常见问题</span>
    </a>
  </div>
</section>

<section class="msm-home-section" aria-labelledby="msm-community">
  <div class="msm-section-heading">
    <h2 id="msm-community">文档与社区</h2>
    <p>获取版本信息、交流使用经验，或提交可以公开的问题与建议。</p>
  </div>
  <div class="msm-reading-grid">
    <a class="msm-reading-link" href="/zh/guide/releases">
      <strong>版本发布</strong>
      <span>查看正式版更新内容</span>
    </a>
    <a class="msm-reading-link" href="https://t.me/msmwiki" target="_blank" rel="noopener">
      <strong>Telegram 频道</strong>
      <span>接收项目公告与版本动态</span>
    </a>
    <a class="msm-reading-link" href="https://t.me/msm_home" target="_blank" rel="noopener">
      <strong>Telegram 交流群</strong>
      <span>交流部署和使用经验</span>
    </a>
    <a class="msm-reading-link" href="https://github.com/msm9527/msm-wiki/issues" target="_blank" rel="noopener">
      <strong>反馈文档问题</strong>
      <span>提交可公开的修订建议</span>
    </a>
  </div>
</section>

<section class="msm-home-section">
  <div class="msm-boundary">
    <h2>只提供管理能力</h2>
    <p>MSM 是闭源、自托管的网络与系统管理软件，只用于管理用户自有或已获授权的环境。项目不提供节点、订阅、网络线路或其他违法违规服务。使用前请阅读<a href="/zh/legal/">使用与合规中心</a>；购买说明见<a href="/zh/legal/pro-and-support">Pro 购买与授权</a>。</p>
  </div>
</section>
