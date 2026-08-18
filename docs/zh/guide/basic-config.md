# 使用指南总览

这页是当前 MSM 后台的菜单地图。如果你想知道“某件事应该去哪个页面”，从这里进入对应专题。

## 访问与登录

- 默认地址：`http://<MSM-IP>:7777`
- 首次访问进入初始化向导
- 菜单会按许可证、功能开关和用户角色显示
- 管理员、操作员、查看者能看到和执行的操作不同

## 基础菜单

### 仪表盘

查看服务状态、系统资源、网络趋势和关键告警。详见 [仪表盘](/zh/guide/dashboard)。

### DNS服务

| 子菜单 | 用途 |
|--------|------|
| **概述** | DNS 服务状态、指标和统计 |
| **规则管理** | 分流规则、名单和数据源 |
| **客户端设置** | 客户端发现、白名单、黑名单和访问策略 |
| **DNS 日志** | 查询记录与分析 |
| **系统功能** | 缓存、内存池和高级运行功能 |
| **配置管理** | 版本和配置文件（按 Pro 能力开放） |

详见 [DNS 服务](/zh/guide/mosdns) 和 [设备管理](/zh/guide/device-management)。

### 代理服务

Clash 与 Sing-Box 使用同一套菜单：

| 子菜单 | 用途 |
|--------|------|
| **概览** | 活动方案、版本、状态和安全切换 |
| **远程回家** | 当前核心的公网入站与客户端配置 |
| **代理节点** | 订阅、节点、策略组和测速 |
| **规则管理** | 当前核心的分流规则 |
| **高级设置** | 可视化策略与核心高级参数（Pro） |
| **连接管理** | 实时连接、规则命中与流量 |
| **配置编辑** | 完整 YAML / JSON 编辑和校验（Pro） |
| **日志查看** | 当前核心运行日志 |

详见 [统一代理服务](/zh/guide/proxy)、[Clash](/zh/guide/clash)、[Sing-Box](/zh/guide/singbox) 和 [远程回家](/zh/guide/home)。

### 进程、用户、诊断与设置

- **进程管理**：查看和控制 MSM 托管服务，详见 [进程管理](/zh/guide/process)
- **用户管理**：管理员维护账号与角色；每个用户在“个人中心”维护资料和密码
- **系统诊断**：检查配置目录、组件依赖、端口、磁盘和权限
- **系统设置**：时区、HTTPS、功能开关、备份与更新
- **API Token 管理**：位于“系统设置 → 系统管理”，需要管理员及相应 Pro 能力
- **配置管理**：浏览和编辑完整配置树（Pro）
- **授权管理**：查看版本、许可证状态、能力，以及支持与社群入口

## Pro 扩展功能

功能入口默认可由系统设置中的开关控制；真正使用时仍会检查 Pro 授权和角色。

### 域名服务

完成 DDNS、ACME 证书和反向代理闭环。详见 [域名服务](/zh/guide/domain-services)。

### 穿透与组网

- **网页穿透**：Cloudflare Tunnel 发布 Web 页面
- **云端私网**：Cloudflare 私网访问 LAN
- **自建私网**：EasyTier、Tailscale 或 WireGuard

详见 [Cloudflare 穿透与组网](/zh/guide/cloudflare) 和 [自建私网](/zh/guide/networking)。

### Docker 管理

管理本机和最多三个 Agent 子节点的容器、镜像、卷、网络、Stack、事件和系统资源。详见 [Docker 管理](/zh/guide/docker-center)。

### 网络工具

使用 Ping、DNS、MTR、Traceroute、测速、端口扫描、SSL、ARP 等工具排查网络。详见 [网络工具](/zh/guide/network-tools)。

## 从 0 到可用的最短路径

1. 安装 MSM 并完成初始化
2. 主路由把 DNS 指向 MSM
3. 主路由添加与 MSM 一致的 FakeIP IPv4 / IPv6 路由
4. 在代理服务导入一个可用订阅并选择节点
5. 在 DNS 客户端设置中配置自己的设备
6. 分别验证 A、AAAA 查询与实际访问
7. 用日志、系统诊断和网络工具检查异常

## 按目标找页面

| 目标 | 页面 |
|------|------|
| 让设备使用 DNS 分流和透明代理 | [路由器集成](/zh/guide/router-integration) → [DNS 服务](/zh/guide/mosdns) → [代理服务](/zh/guide/proxy) |
| 从外网打开家庭网页 | [域名服务](/zh/guide/domain-services) 或 [Cloudflare 网页穿透](/zh/guide/cloudflare) |
| 从外网访问整个家庭 LAN | [Cloudflare 云端私网](/zh/guide/cloudflare)、[自建私网](/zh/guide/networking) 或 [远程回家](/zh/guide/home) |
| 管理家庭服务器容器 | [Docker 管理](/zh/guide/docker-center) |
| 排查 DNS、路由、端口和证书 | [网络工具](/zh/guide/network-tools) |
| 修改全局模块开关 | [系统设置](/zh/guide/settings) |
| 检查授权和角色 | [授权管理](/zh/guide/license)、[用户管理](/zh/guide/user-management) |

## 下一步

- [首次使用](/zh/guide/first-use)
- [完整使用流程](/zh/guide/complete-workflow)
- [系统设置](/zh/guide/settings)
- [API 参考](/zh/guide/api)
