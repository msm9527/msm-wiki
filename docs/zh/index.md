---
layout: home

hero:
  name: "MSM"
  text: "家庭网络统一管理平台"
  tagline: 统一管理 MosDNS、Clash、Sing-Box、域名发布、远程组网与 Docker 资源
  image:
    src: /logo/logo-square.svg
    alt: MSM Logo
  actions:
    - theme: brand
      text: 🚀 快速上手
      link: /zh/guide/install
    - theme: alt
      text: 🔌 路由器接入
      link: /zh/guide/router-integration
    - theme: alt
      text: 🧭 功能地图
      link: /zh/guide/basic-config
    - theme: alt
      text: 使用与合规
      link: /zh/legal/

features:
  - icon: 🌐
    title: MosDNS 双栈分流
    details: 管理 DNS 规则、客户端策略、查询日志以及 FakeIP IPv4 / IPv6 链路
  - icon: 🔄
    title: 统一代理服务
    details: 在 Clash Meta、Clash Smart 与 Sing-Box 之间安全切换，使用同一套管理入口
  - icon: 🏠
    title: 回家与私有组网
    details: 提供双核心多协议远程回家、Cloudflare 私网以及 EasyTier、Tailscale、WireGuard 自建私网
  - icon: 🔗
    title: 域名发布闭环
    details: 集中完成 DDNS、HTTPS 证书、反向代理、健康检查与故障诊断
  - icon: 📦
    title: Docker 管理
    details: 管理本机及独立子节点的容器、镜像、网络、存储卷和应用栈
  - icon: 🧰
    title: 网络诊断工作台
    details: 集成 Ping、DNS、MTR、Traceroute、测速、端口扫描和局域网工具
---

## 一句话理解

MSM 从旁路由 DNS 与透明代理管理出发，现在把家庭网络常用的代理、域名发布、远程接入、Docker 运维和网络诊断放进了同一个 Web 管理平台。

基础旁路由链路仍然只需要三件事：安装 MSM、让主路由把 DNS 指向 MSM、再把实际启用的 FakeIP IPv4 / IPv6 网段路由回 MSM。

::: info 只提供管理能力
MSM 是面向用户自有或已授权环境的网络与系统管理平台。Clash 功能只负责管理用户自行提供且有权使用的内核与配置；项目不提供节点、订阅、网络接入、内容分发或其他违法违规服务，也不为未授权访问提供授权或背书。使用前请阅读 [使用与合规中心](/zh/legal/)。
:::

## 核心使用路径

### 旁路由与透明代理

1. 完成 [安装与初始化](/zh/guide/install)
2. 按 [路由器集成总览](/zh/guide/router-integration) 配置 DNS 和 FakeIP 静态路由
3. 在 [DNS 服务](/zh/guide/mosdns) 配置规则与客户端
4. 在 [代理服务](/zh/guide/proxy) 导入订阅、选择节点并验证连接

### 从外网访问家庭网络

- 只需访问家庭 Web 服务：使用 [域名服务](/zh/guide/domain-services) 或 [Cloudflare 网页穿透](/zh/guide/cloudflare)
- 需要访问 SSH、远程桌面、数据库或多个局域网设备：使用 [Cloudflare 云端私网](/zh/guide/cloudflare) 或 [自建私网](/zh/guide/networking)
- 已有公网 IP / DDNS 并希望使用代理客户端：使用 [远程回家](/zh/guide/home)

### 家庭服务器运维

- 在 [Docker 管理](/zh/guide/docker-center) 统一管理本机和子节点资源
- 在 [网络工具](/zh/guide/network-tools) 检查 DNS、路由、端口、证书和链路质量
- 在 [系统诊断](/zh/guide/diagnostics) 查看 MSM 组件健康状态

## 推荐阅读顺序

1. [安装总览](/zh/guide/install)
2. [首次使用](/zh/guide/first-use)
3. [路由器集成总览](/zh/guide/router-integration)
4. [DNS 服务管理](/zh/guide/mosdns)
5. [设备管理](/zh/guide/device-management)
6. [统一代理服务](/zh/guide/proxy)
7. 按需进入 [Pro 扩展功能](/zh/guide/basic-config#pro-扩展功能)

## 三步跑通基础链路

### 1. 安装并进入管理界面

- 从 [安装总览](/zh/guide/install) 选择你的平台
- 完成初始化向导
- 确认可以访问 `http://<MSM-IP>:7777`

### 2. 完成主路由接入

- DHCP DNS 默认只下发 MSM 的 IPv4 地址
- 添加与 MSM 当前配置一致的 FakeIP IPv4 静态路由
- 启用 IPv6 时，再添加 FakeIP IPv6 静态路由

默认模板使用 `28.0.0.0/8` 和 `f2b0::/18`；如果你修改过网段，应以 MSM 页面中的实际配置为准。

### 3. 回到 MSM 完成业务配置

- 检查 DNS 分流规则和 FakeIP 网段
- 配置需要代理的客户端
- 导入代理订阅并确认策略组可用
- 分别验证 `A`、`AAAA` 查询与实际访问

## 已提供教程的路由器系统

- [RouterOS（MikroTik）](/zh/guide/routeros)
- [爱快（iKuai）](/zh/guide/ikuai)
- [OpenWrt / LEDE](/zh/guide/openwrt)
- [UniFi](/zh/guide/unifi)

其他支持静态路由和自定义 DNS 的系统，也可以参考 [路由器集成总览](/zh/guide/router-integration) 按相同原则配置。

## 功能开关与 Pro 权限

域名服务、穿透与组网、Docker 管理和网络工具属于 Pro 扩展模块。入口是否显示由 **系统设置 → 功能开关** 控制；是否可以使用和执行高风险操作，还会同时检查 Pro 授权、当前用户角色及对应能力。

## 社区与资料

- [Telegram 交流群](https://t.me/msm_home)
- [Telegram 频道](https://t.me/msmwiki)
- [Tom佬的技术博客](https://blog.847977.xyz/)
- [以 FakeIP 分流为基石的一套科学方案](https://blog.847977.xyz/2025/10/30/%E4%BB%A5fakeip%E5%88%86%E6%B5%81%E4%B8%BA%E5%9F%BA%E7%9F%B3%E7%9A%84%E4%B8%80%E5%A5%97%E7%A7%91%E5%AD%A6%E6%96%B9%E6%A1%88/)
- [MosDNS 相关实践（PH 佬）](https://github.com/yyysuo/mosdns)
- [StoreHouse 脚本合集](https://github.com/herozmy/StoreHouse/tree/latest)

## 下一步

- [完整使用流程](/zh/guide/complete-workflow) - 从安装到验收串起来看
- [使用指南总览](/zh/guide/basic-config) - 对照后台菜单找功能
- [统一代理服务](/zh/guide/proxy) - 了解核心选择与安全切换
