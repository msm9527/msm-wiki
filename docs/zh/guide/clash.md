---
title: Clash 管理
description: MSM 的 Clash 内核、配置、节点与合规使用边界
outline: deep
---

# Clash 管理

Clash 是 MSM **统一代理服务** 中的一类本地管理方案。节点、规则、连接和日志操作请从 [统一代理服务](/zh/guide/proxy) 开始；本页说明 Clash 方案特有的选择和注意事项。

::: info 文档命名与技术标识
文档面向用户统一使用 **Clash** 和 **Clash Smart**。当前方案使用 MetaCubeX 兼容内核及 Smart 变体，因此命令、API、进程名、目录和旧版界面中仍可能出现技术标识 `mihomo`。这些标识不代表 MSM 提供独立的网络接入服务。
:::

::: warning 只提供管理能力
MSM 只管理用户自行提供且有权使用的 Clash 内核、配置、规则、节点和订阅。项目不提供节点、订阅、网络接入、内容分发或任何违法违规服务，也不授权将该功能用于未授权访问、侵权或其他违法违规活动。用户应对数据来源、使用授权、具体用途和当地合规负责。
:::

## 核心类型

### Clash Meta

Clash Meta 方案支持稳定版和 Alpha 预览版。稳定版适合日常使用；Alpha 适合需要预览上游功能且能自行处理兼容问题的用户。

### Clash Smart

Clash Smart 使用专用核心、模板和 Smart 策略组，需要：

- 已激活 Pro
- 当前账号具备 `proxy.manage` 能力
- **系统设置 → 功能开关** 中启用 Clash Smart

Smart 配置与 Meta / Alpha 配置并不等价。应通过 MSM 的方案切换完成迁移，不要手动替换核心文件。

## 可管理能力

- YAML 配置与在线校验
- 订阅、节点、策略组和延迟测试
- 规则、Rule Provider 与策略管理
- 实时连接、流量、规则命中和手动断开
- TUN、通用代理参数和高级设置
- Shadowsocks、VLESS、Trojan、AnyTLS、Hysteria2、TUIC v5 远程回家监听器
- 配置历史、差异和回滚（按授权能力开放）

## 推荐流程

1. 在 **代理服务 → 概览** 选择 Clash Meta 或 Clash Smart
2. 等待准备、迁移、网络、控制器和最终状态五个阶段完成
3. 在 **代理节点** 更新订阅并测速
4. 在 **规则管理** 检查规则与策略组
5. 在 **连接管理** 验证真实流量
6. 最后查看日志，确认没有持续报错

## 配置注意事项

- FakeIP 网段和 DNS 模式必须与 MosDNS、主路由静态路由保持一致
- Smart 专用的策略字段不能直接用于 Meta / Alpha
- 结构化编辑和原始 YAML 编辑混用后，应再次查看保存差异
- 新版写入会尽量保留注释和顺序，但自动迁移仍可能重排相关结构
- 不要让 Clash 与 Sing-Box 同时接管透明代理网络

## 远程回家

进入 **代理服务 → 远程回家** 后，MSM 会按所选协议在当前 Clash 配置中维护 listener，并生成对应的客户端 YAML。除 Shadowsocks 外的协议需要 TLS 证书与私钥；VLESS 和 TUIC v5 还使用 UUID。保存前会用当前核心校验完整配置，应用失败时会尝试恢复旧配置和原运行状态。

详细步骤见 [远程回家](/zh/guide/home)。

## 故障排查

### 切换到 Smart 失败

- 确认 Pro 和 `proxy.manage` 能力有效
- 确认 Smart 功能开关已开启
- 查看进度窗口是否提示二进制家族或模板不匹配
- 检查日志中的配置字段兼容错误

### 保存后无法启动

- 先执行页面内配置校验
- 查看最近核心日志
- 使用配置历史回滚到上一个可用版本
- 确认没有把 Smart 字段留在 Meta 核心配置中

## 下一步

- [统一代理服务](/zh/guide/proxy)
- [Sing-Box 核心](/zh/guide/singbox)
- [远程回家](/zh/guide/home)
- [日志查看](/zh/guide/logs)
