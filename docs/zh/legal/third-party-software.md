---
title: 第三方软件与许可证
description: MSM 自有代码与第三方开源程序、依赖、规则数据及外部服务的许可边界
outline: deep
pageClass: legal-page
---

# 第三方软件与许可证

> 版本：`1.2` · 更新日期：2026 年 11 月 24 日

::: info 核心原则
MSM 自有代码适用其自身软件许可；MSM 使用开源依赖或管理开源程序，不会把第三方版权转移给 MSM，第三方许可证也不能替代 MSM 自有代码的许可。每一部分分别适用各自的权利与义务。
:::

## 自研代码与开源组件的关系

MSM 的控制面、界面、内置纯 Go 反向代理引擎、安装升级逻辑与其他自研部分保持自身许可边界；同时，MSM 对随包编译、打包或分发的第三方开源组件严格保留其版权声明与许可证文本（见发布包内的 `THIRD_PARTY_NOTICES.md`、`OSS_PROVENANCE.md` 与 `licenses/` 目录）。

常见集成关系如下：

| 使用方式 | 常见情形 | 许可边界 |
| --- | --- | --- |
| 编译进 MSM 二进制 | Go、前端与系统框架依赖 | 随发布包提供第三方声明与对应许可证正文 |
| 作为独立进程管理 | MosDNS、Clash、Sing-Box、EasyTier、Tailscale、cloudflared | 分别独立运行并适用各自许可证及源码条款 |
| 按需下载与更新 | 核心二进制、规则数据、GeoIP / Geosite | 从各自上游或镜像获取，遵守对应发布条款 |
| 连接第三方服务 | DNS 服务商、ACME、Cloudflare、爱发电等 | 适用对应平台的服务条款与隐私政策 |
| 用户自行导入 | 节点、订阅、规则、容器镜像、自定义配置 | 由用户负责来源授权与合规使用 |

## 主要受管与集成组件

下表为常见第三方组件的参考说明，具体随包依赖版本以对应版本发布包内的 `THIRD_PARTY_NOTICES.md` 为准：

| 组件或类别 | 在 MSM 中的关系 | 许可证或条款说明 |
| --- | --- | --- |
| [MosDNS](https://github.com/IrineSistiana/mosdns) | 由 MSM 安装、配置并独立运行 | 适用其发布版本随附的 GPL 许可证 |
| [Clash 兼容核心上游](https://github.com/MetaCubeX/mihomo) | 由 MSM 安装、配置并独立运行 | 上游采用 MIT 许可证 |
| [Sing-Box](https://github.com/SagerNet/sing-box) / reF1nd 派生构建 | 由 MSM 下载并独立运行 | 适用 GPL-3.0-or-later 及其对应源码条款 |
| 内置 Edge 反向代理引擎 / 可选外部 [Caddy](https://github.com/caddyserver/caddy) | 默认由 MSM 内置纯 Go 引擎在进程内处理；仅在显式配置外部兼容模式时通过 HTTP 连接用户自建 Caddy | 外部 Caddy 适用 Apache-2.0（MSM 发布包不分发 Caddy 二进制） |
| [EasyTier](https://github.com/EasyTier/EasyTier) | 自建私网组件 | 上游采用 LGPL-3.0 |
| [go-gost](https://github.com/go-gost/gost) | 隧道与桥接组件 | 上游采用 MIT 许可证 |
| [cloudflared](https://github.com/cloudflare/cloudflared) | Cloudflare 隧道客户端 | 客户端采用 Apache-2.0；Cloudflare 服务另受其服务条款约束 |
| Tailscale / Headscale / WireGuard 生态 | 私网和远程接入 | 各组件分别适用各自许可证与服务条款 |
| WARP 客户端与 Cloudflare One | 可选外部客户端或服务 | 适用 Cloudflare 对应服务条款 |
| 规则数据、GeoIP、Geosite、图标库 | 模板或运行时下载 | 按各自数据与资源许可证使用 |

## GPL 等开源组件的独立边界

MSM 对自有代码的许可条款不会削减 MosDNS、Sing-Box 等独立运行的 GPL 程序的开源权利与义务；反之，通过命令行、文件或网络协议管理这些独立进程，也不会改变 MSM 自有代码的许可属性。

## 用户自行配置的第三方内容

MSM 不提供代理节点、订阅、带宽或网络线路。用户自行填写 URL、导入配置或连接第三方服务时，应确认：

- 内容来源合法，自己拥有使用和处理权限；
- 不将仅限个人使用或禁止再分发的内容对外公开；
- 不将密钥、Token、订阅 URL 或敏感配置写入公开模板与 Issue；
- 遵守对应第三方服务的频率、用途和地区限制。

## 商标与兼容性表述

“兼容”“支持”“可管理”仅表示技术集成关系，不代表获得第三方赞助、认证或商标授权。MosDNS、Clash、Sing-Box、Caddy、Docker、Cloudflare、Tailscale、WireGuard、爱发电及其他名称与标识均归各自权利人所有。

## 许可证反馈

如发现发布包中的第三方声明、许可证文本或来源标注存在遗漏或错误，欢迎通过 [Wiki Issues](https://github.com/msm9527/msm-wiki/issues) 提交版本、文件名和具体说明。

相关文档：

- [知识产权说明](/zh/legal/intellectual-property)
- [Pro 购买与授权](/zh/legal/pro-and-support)
- [免责声明](/zh/legal/disclaimer)
