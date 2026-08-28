# 完整使用流程

本页把 MSM 从安装、旁路由接入、DNS 与代理配置，到扩展模块和最终验收串成一条完整路径。首次部署先完成“基础链路”，不要同时开启所有 Pro 模块。

## 流程总览

```text
规划网络
  → 安装与初始化
  → 主路由 DNS + FakeIP 路由
  → MosDNS 规则与客户端
  → 统一代理服务
  → A / AAAA + 实际连接验收
  → 按需开启域名、组网、Docker 和网络工具
  → 备份
```

## 1. 规划网络

部署前记录：

- 主路由 LAN 地址与网段
- MSM 固定 IPv4 地址
- 可用时记录 MSM IPv6 地址
- 主路由 DHCP DNS 和静态路由入口
- 当前家庭 LAN CIDR
- 是否有公网 IPv4、可入站 IPv6或 CGNAT
- 是否使用 Docker

示例：

| 项目 | 示例 |
|------|------|
| 主路由 | `192.168.1.1` |
| MSM | `192.168.1.2` |
| 家庭 LAN | `192.168.1.0/24` |
| FakeIP IPv4 | `28.0.0.0/8` |
| FakeIP IPv6 | `f2b0::/18` |

FakeIP 示例来自默认模板，必须在部署时与 MSM 实际配置核对。

## 2. 安装 MSM

从 [安装总览](/zh/guide/install) 选择 Linux、macOS、Alpine 或 Docker。安装后先验证管理界面：

```text
http://<MSM-IP>:7777
```

Docker 用户还要核对：

- 数据卷已持久化
- 管理端口已发布
- DNS、代理与回家所需端口正确映射
- 容器网络模式满足旁路由需求

## 3. 初始化

1. 创建管理员账号
2. 设置时区、管理端口和可选 HTTPS
3. 选择正确网络接口和 IPv6 策略
4. 安装 MosDNS
5. 选择 Clash Meta、Clash Smart 或 Sing-Box
6. 等待组件、控制器和网络就绪检查完成

首次使用优先选择 Clash Meta 或 Sing-Box。Smart 需要对应 Pro 能力。

## 4. 接入主路由

### DHCP DNS

把客户端 DNS 指向 MSM。若你的网络只稳定使用 MSM 的 IPv4 DNS，就只下发该地址，不要附加一个会绕过 MSM 的公共 DNS。

### FakeIP 静态路由

把当前启用的 FakeIP IPv4 网段路由到 MSM IPv4；启用 IPv6 时，再把 FakeIP IPv6 网段路由到 MSM IPv6。

```text
FakeIP IPv4 → MSM IPv4
FakeIP IPv6 → MSM IPv6
```

详见 [路由器集成总览](/zh/guide/router-integration) 和对应系统教程。

## 5. 配置 MosDNS

进入 **DNS服务**：

1. 在概述确认服务与查询正常
2. 在规则管理核对直连、代理和拦截规则
3. 在客户端设置选择关闭、白名单或黑名单模式
4. 添加一台测试设备
5. 在 DNS 日志确认该设备查询进入 MSM

不要一开始把所有设备都加入。先用一台可随时恢复 DNS 的设备完成验收。

## 6. 配置代理服务

进入 **代理服务**：

1. 在概览确认当前方案和核心状态
2. 在代理节点导入订阅
3. 更新订阅并执行延迟测试
4. 在策略组选择一个可用节点
5. 在规则管理核对兜底规则
6. 在连接管理观察真实流量

需要切换 Clash / Smart / Sing-Box 时，从概览使用方案卡片，等待完整五阶段流程，不要手工启停进程。

## 7. 验收基础链路

### DNS

```bash
nslookup example.com <MSM-IP>
dig A example.com @<MSM-IP>
dig AAAA example.com @<MSM-IP>
```

根据规则确认返回真实 IP 或 FakeIP，并在 DNS 日志中看到对应客户端和规则命中。

### 代理

从测试设备访问一个应代理的目标，然后检查：

- 连接管理中有对应连接
- 命中的规则、策略组和节点正确
- 上传 / 下载流量变化
- 代理日志没有持续错误

### 直连

访问一个应直连的国内或内网目标，确认没有被错误送入代理。

### 故障隔离

如果失败，按顺序检查：

1. 客户端是否真的使用 MSM DNS
2. DNS 是否返回预期地址
3. FakeIP 静态路由是否指向 MSM
4. 当前活动代理核心是否就绪
5. 规则与策略组是否指向可用节点
6. IPv4 与 IPv6 是否有一侧未配置完整

## 8. 选择远程访问方式

基础链路稳定后，根据目标选择：

| 目标 | 推荐模块 |
|------|----------|
| 使用自己的域名发布 Web 服务 | [域名服务](/zh/guide/domain-services) |
| 无公网 IP 发布 Web 页面 | [Cloudflare 网页穿透](/zh/guide/cloudflare) |
| 无公网 IP 访问整个家庭 LAN | [EasyTier / Tailscale / WireGuard](/zh/guide/networking) |
| 自建跨站私网 | [EasyTier / Tailscale / WireGuard](/zh/guide/networking) |
| 有公网入口并使用代理客户端 | [多协议远程回家](/zh/guide/home) |

先选一种方式跑通，再决定是否需要并行通道。

## 9. 管理 Docker 与诊断网络

- 使用 [Docker 管理](/zh/guide/docker-center) 接入本机或最多三个 Agent 子节点
- 使用 [网络工具](/zh/guide/network-tools) 检查 DNS、路由、端口、HTTP、SSL 和链路质量

Docker Agent 优先使用主动回连；HTTPS 直连必须使用可信证书。网络工具结果代表 MSM 节点或容器视角。

## 10. 备份与维护

基础链路和扩展模块都验证后：

1. 创建完整备份并下载到其他设备
2. 记录主路由 DNS 与静态路由
3. 记录当前代理方案和关键端口
4. 对外部 DNS、Cloudflare、Agent 等资源单独留存清单
5. 升级前再次备份

## 最终检查清单

- [ ] MSM 管理界面可稳定访问
- [ ] MosDNS 与当前代理核心运行正常
- [ ] 客户端只使用预期 DNS
- [ ] FakeIP IPv4 / IPv6 路由与 MSM 一致
- [ ] DNS 日志能看到测试设备
- [ ] 代理连接命中预期规则和节点
- [ ] 直连目标没有错误代理
- [ ] Pro 模块开关与授权符合预期
- [ ] 公网 / 私网功能已从真正外部网络验证
- [ ] 已创建离机备份

## 下一步

- [系统诊断](/zh/guide/diagnostics)
- [故障排查](/zh/faq/troubleshooting)
- [更新升级](/zh/guide/update)
