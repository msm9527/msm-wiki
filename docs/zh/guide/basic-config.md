# 使用指南总览

这页是当前 MSM 后台的菜单地图。如果你想知道“某件事应该去哪个页面”，可以直接从这里定位对应专题。

## 访问与登录

- 默认地址：`http://<MSM-IP>:7777`（启用 HTTPS 后为 `https://<MSM-IP>:7777`）
- 首次访问自动进入初始化向导
- 侧边栏与页面标签会同时受 **应用商店安装状态、Pro 授权、功能开关与用户角色** 控制
- 支持 **简洁模式 / 高级模式** 与多种导航及仪表盘样式，可在 **系统设置 → 外观设置** 调整

## 平台基础入口

### 仪表盘（`/`）

查看系统资源、服务状态、网络趋势、DNS/代理概览和关键告警。详见 [仪表盘](/zh/guide/dashboard)。

### 应用商店（`/apps`）

MSM 采用模块化安装机制：核心模块（MosDNS、Clash、Sing-Box）与扩展模块（域名服务 Edge、Cloudflare 隧道、自建私网、Docker 管理、网络工具、图标库）均可在 **应用商店** 一键安装、查看依赖关系或按需卸载。

### 图标库（`/icons`）

集中管理本地与自定义图标资源，支持与 **代理策略组（`/proxy/icon-linkage`）** 及 **Docker 容器卡片** 自动联动展示。

### DNS 服务（`/mosdns`）

| 子页面 | 用途 |
|--------|------|
| **概述** | DNS 服务状态、核心指标与命中统计 |
| **规则管理** | 分流规则、黑白名单、AdGuard 拦截、Geosite、自动分类与在线数据源 |
| **客户端设置** | 局域网设备发现、白名单、黑名单与单设备分流策略 |
| **DNS 日志** | 实时查询记录、筛选与解析链路分析 |
| **系统功能** | 缓存管理、内存池、批量重建与内置配置备份 |
| **配置管理** | 版本管理与完整配置文件编辑（按 Pro 能力开放） |

详见 [DNS 服务](/zh/guide/mosdns) 和 [设备管理](/zh/guide/device-management)。

### 统一代理服务（`/proxy`）

Clash Meta、Clash Smart 与 Sing-Box 共享同一套导航入口与控制面：

| 子页面 | 用途 |
|--------|------|
| **概览** | 当前运行核心、版本、状态与五阶段安全切换 |
| **代理节点** | 订阅管理、节点测速、策略组切换与 Clash Smart 权重排行 |
| **规则管理** | 当前核心的分流规则与 Rule Provider |
| **连接管理** | 实时活跃连接、规则命中、流量统计与 Smart 降权切换 |
| **策略编辑** | 可视化编辑代理组、订阅健康检查与 Smart 核心参数 |
| **配置编辑** | 完整 YAML / JSON 编辑、在线校验与历史回滚（Pro） |
| **日志查看** | 当前核心实时运行日志 |

详见 [统一代理服务](/zh/guide/proxy)、[Clash 管理](/zh/guide/clash) 和 [Sing-Box 核心](/zh/guide/singbox)。

### 回家与私网（`/networking`）

远程回家入站与终端配置分发已和自建私网统一收口，旧地址 `/proxy/home` 会自动跳转：

- **自建私网（`/networking`）**：WireGuard、EasyTier、Tailscale 按需安装、多选并存与成员设备管理
- **代理协议回家（`/networking/inbound`）**：管理 Clash / Sing-Box 多协议公网入站监听器、跨核心一键同步与运行检查
- **终端配发（`/networking/delivery`）**：跨核心生成五端完整客户端配置（Clash / Clash Smart / Sing-Box reF1nd / 官方 Sing-Box / Loon）、二维码、可撤销分享短链与防代理 TUN 抢路由规则
- **Cloudflare 内网穿透（`/cloudflare/tunnel`）**：无需公网 IP 通过 HTTPS 域名发布内网 Web 服务

详见 [远程回家](/zh/guide/home)、[自建私网](/zh/guide/networking) 和 [Cloudflare 内网穿透](/zh/guide/cloudflare)。

## Pro 扩展功能

以下模块在 **应用商店** 安装并开启 **系统设置 → 功能开关** 后显示（同时校验 Pro 授权与用户角色）：

- **域名服务（Edge 网关，`/edge`）**：进程内纯 Go 网关引擎，一站式完成全链路实时流量拓扑、DDNS、ACME 证书与部署钩子、L7 反向代理（智能全兼容 / 严格防跨站 / 41 款应用预设 / 端口直通 / 微缓存）、L4 转发与 443 零解密分流、STUN NAT1 穿透。详见 [域名服务](/zh/guide/domain-services)。
- **Docker 管理（`/docker`）**：纳管本机及独立 Agent 子节点（`msmbox/msm-agent`）的容器、应用栈、镜像、存储卷、网络、更新检查、实时事件与操作审计。详见 [Docker 管理](/zh/guide/docker-center)。
- **网络工具（`/nettools`）**：集成 Ping、DNS、MTR、Traceroute、测速、iPerf3、端口扫描、SSL、WOL 与 ARP 等诊断工具。详见 [网络工具](/zh/guide/network-tools)。

## 系统与运维菜单

- **进程管理（`/process`）**：查看并启停 MSM 托管的全部子进程，详见 [进程管理](/zh/guide/process)
- **配置管理（`/config`）**：浏览与编辑全局配置树、历史版本与回滚（Pro）
- **日志查看（`/logs`）**：聚合查看主服务与各核心日志（支持独立窗口打开）
- **用户管理（`/users`）**：管理员分配 `admin` / `operator` / `viewer` 角色；个人资料与改密在「个人中心」标签
- **系统诊断（`/system`）**：环境检查、FakeIP 与网络规则诊断、存储清理预览
- **系统设置（`/settings`）**：运行参数、HTTPS、模块开关、下载镜像源、外观与导航风格、通知渠道、v3 备份恢复、在线更新、API Token 管理、重置与安全卸载
- **授权管理（`/license`）**：查看当前版本、Pro 授权状态、细分能力与官方社区入口

## 按目标找页面

| 目标 | 推荐路径 |
|------|----------|
| 从 0 搭好旁路由 DNS + 透明代理 | [路由器接入](/zh/guide/router-integration) → [DNS 服务](/zh/guide/mosdns) → [代理服务](/zh/guide/proxy) |
| 给外网发布家庭 Web 或 TCP/UDP 服务 | [域名服务](/zh/guide/domain-services) 或 [Cloudflare 内网穿透](/zh/guide/cloudflare) |
| 外出安全访问家庭内网全部设备 | [自建私网](/zh/guide/networking) 或 [远程回家](/zh/guide/home) |
| 集中管理本机与多台 NAS / 云主机容器 | [Docker 管理](/zh/guide/docker-center) |
| 浏览器内快捷切节点与查 DNS | [浏览器助手（MSM Assistant）](/zh/guide/assistant) |
| 排查 DNS、路由、端口与证书问题 | [网络工具](/zh/guide/network-tools) / [故障排查](/zh/faq/troubleshooting) |
| 调整模块开关、镜像源、通知与外观 | [系统设置](/zh/guide/settings) |

## 下一步

- [首次使用](/zh/guide/first-use)
- [完整使用流程](/zh/guide/complete-workflow)
- [系统设置](/zh/guide/settings)
- [API 参考](/zh/guide/api)
