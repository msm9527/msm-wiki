# 什么是 MSM？

MSM 是面向家庭网络和小型实验环境的统一管理平台。它以 MosDNS 分流与 Mihomo / Sing-Box 透明代理为基础，同时管理域名发布、远程穿透与私网、Docker 资源和网络诊断。

## 设计目标

- 让基础旁路由链路可以通过 Web 界面安装、配置和验证
- 把 DNS、代理与系统网络变化放在同一个事务和状态视图中
- 为进阶用户提供结构化编辑、原始配置、历史和诊断
- 将公网发布、远程接入和家庭服务器运维纳入统一权限边界
- 在失败时给出明确阶段、日志和可恢复路径

## 基础旁路由架构

```text
客户端
  └─ DNS 请求 → 主路由 → MSM / MosDNS
                         ├─ 直连域名 → 返回真实 IP
                         └─ 代理域名 → 返回 FakeIP
                                          ↓
客户端访问 FakeIP → 主路由静态路由 → MSM 活动代理核心 → 代理节点
```

主路由负责把客户端 DNS 交给 MSM，并把 FakeIP 网段路由回 MSM；MosDNS 负责判断域名；当前活动的 Mihomo 或 Sing-Box 负责透明代理流量。

## 三个关键概念

### DNS 分流

MosDNS 根据域名、客户端和自定义规则选择解析链路。常见配置让直连域名返回真实 IP，让需要代理的域名返回 FakeIP。

### FakeIP

FakeIP 是代理核心可识别的虚拟地址。主路由必须把启用的 FakeIP IPv4 / IPv6 网段指向 MSM，否则客户端会得到虚拟地址但流量无法到达代理核心。

默认模板常用 `28.0.0.0/8` 和 `f2b0::/18`；用户可以调整，因此路由器文档中的值必须与实际配置核对。

### 单一活动代理核心

MSM 支持官方 Mihomo、Mihomo Smart 和 Sing-Box，但同一时刻只应有一个本地核心接管代理网络。统一切换流程会准备目标核心、迁移配置、应用网络规则并验证控制接口。

## 主要组件

### MosDNS

- DNS 分流、缓存和规则
- 客户端名单与策略
- FakeIP IPv4 / IPv6
- 查询日志、统计和运行诊断
- 配置、版本与数据源管理

### 统一代理服务

- 官方 Mihomo（Meta / Alpha）
- Mihomo Smart（Pro）
- reF1nd Sing-Box
- 统一的节点、规则、连接、配置、日志和远程回家入口
- 跨核心订阅迁移、网络协调和就绪验证

### 域名服务

- DDNS 任务与权威解析验证
- ACME 自动证书和 PEM 导入
- 反向代理、健康检查和访问日志
- 可恢复的一键域名发布流程

### 穿透与私网

- Cloudflare 网页穿透与云端私网
- EasyTier、Tailscale / Headscale、WireGuard 自建私网
- 双核心多协议远程回家（Shadowsocks、VLESS、Trojan、AnyTLS、Hysteria2、TUIC v5）

### Docker 管理

- 本机 Docker Engine
- 最多三个独立 Agent 子节点
- 容器、镜像、存储卷、网络、Stack、事件和系统资源

### 网络工具

提供 DNS、Ping、MTR、Traceroute、HTTP、SSL、测速、端口扫描、ARP、iPerf3 等诊断工具，从 MSM 节点视角验证网络。

## 适用场景

- 用旁路由统一管理家庭 DNS 和透明代理
- 在不修改每台客户端的情况下按设备与域名分流
- 通过公网域名发布 NAS、相册或家庭 Web 服务
- 从外网安全访问 SSH、远程桌面、数据库和家庭 LAN
- 在一个控制台运维多台家庭服务器的 Docker 资源
- 定位 DNS、路由、证书、端口和链路质量问题

## 权限模型

功能是否可用由三层共同决定：

1. **系统功能开关**：决定模块入口与 API 是否启用
2. **许可证能力**：决定 Pro 功能是否解锁
3. **用户角色**：管理员、操作员、查看者拥有不同读写范围

高风险 Pro 操作还可能要求有效的本机授权证明或在线授权，不能仅靠前端显示状态判断权限。

## 部署方式

- Linux 单二进制与系统服务
- macOS
- Alpine Linux
- Docker

旁路由与透明代理需要管理 DNS、路由、TUN / nftables 等系统能力。Docker 部署时要额外理解端口、网络命名空间、Capabilities 和持久化卷边界。

## 网络要求

- MSM 主机拥有稳定的局域网地址
- 主路由支持自定义 DHCP DNS 和静态路由
- 使用 IPv6 时，MSM 与主路由具有可用 IPv6 地址和回程
- 下载核心、订阅和数据源时能够访问对应上游
- 使用公网回家、WireGuard 或域名发布时具备相应公网入口

## 下一步

- [核心功能](/zh/introduction/features)
- [安装总览](/zh/guide/install)
- [首次使用](/zh/guide/first-use)
- [使用指南总览](/zh/guide/basic-config)
