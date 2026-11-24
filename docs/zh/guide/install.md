# 安装总览

这页适合第一次接触 MSM 的用户，帮助你快速选定部署方式，并明确安装完成后的最小验收动作。

::: warning 安装即表示你应了解使用边界
MSM 是自托管管理平台。请仅用于自有或已获明确授权的设备、网络、域名和第三方账户，安装前请先阅读[合规使用规范](/zh/legal/acceptable-use)与[免责声明](/zh/legal/disclaimer)。
:::

## 选择安装方式

| 场景 | 推荐方式 | 说明 |
| --- | --- | --- |
| Linux 服务器 / 虚拟机 / NAS | [Linux 安装](/zh/guide/install-linux) | 一键脚本自动识别 glibc/musl 与架构，托管 systemd 服务 |
| macOS 主机（macOS 26+） | [macOS 安装](/zh/guide/install-macos) | 原生 SwiftUI 桌面应用（多服务器 + LaunchDaemon）或 CLI 版 |
| OpenWrt 路由器 | [OpenWrt 安装](/zh/guide/install-openwrt) | 原生 `.ipk` / `.apk` + LuCI 插件 + procd 服务 |
| Alpine Linux | [Alpine 安装](/zh/guide/install-alpine) | musl 静态二进制 + `msm service install --manager openrc` |
| Docker 环境 | [Docker 安装](/zh/guide/docker) | 多架构容器镜像 `msmbox/msm`（支持 amd64/arm64/arm/v7） |
| 远端 Docker 子节点 | [Docker 管理](/zh/guide/docker-center#独立-agent-子节点) | 独立轻量镜像 `msmbox/msm-agent` 或静态二进制 |
| PanaBit 网关 | [正式版发布](/zh/guide/releases) | 随版本发布提供 `.apx` 应用包 |
| 浏览器伴随扩展 | [浏览器助手（MSM Assistant）](/zh/guide/assistant) | Chrome / Edge / Firefox 三平台扩展（可选） |

## 通用前置要求

- **权限**：Linux / OpenWrt 需要 `root` 或 `sudo`，macOS 托管本机服务需要管理员权限。
- **网络**：能够访问 GitHub Releases 或官方国内镜像源（`msm.19930520.xyz`）。
- **端口**：默认使用 `7777`（Web 管理）、`53 / 1053`（DNS）、`7890 / 7891 / 7892`（代理）；按需启用 `80 / 443`（Edge 网关）及 `31303+`（远程回家）。

## 推荐落地顺序

首次搭建建议按下面四步推进，不要一开始就改动过多规则和策略组：

1. **安装并进入管理界面**
   - 默认地址：`http://<MSM-IP>:7777`（例如 `http://192.168.20.2:7777`）
2. **完成初始化向导与按需装模块**
   - 创建管理员账户、检查本机 IPv4 / IPv6 与网络接口
   - 如需 DNS、代理、Edge 网关、Docker 管理等模块，按向导或在 **应用商店（`/apps`）** 中安装并启用
3. **完成主路由接入**（参考 [路由器集成总览](/zh/guide/router-integration)）
   - DHCP DNS 默认只下发 MSM 的 IPv4 地址
   - 添加与 MSM 页面当前值一致的 FakeIP IPv4 静态路由
   - 启用 IPv6 时，再添加 FakeIP IPv6 静态路由
4. **回到 MSM 完成业务配置与验收**
   - 配置 DNS 分流规则、设备名单与代理订阅
   - 分别验证 `A` / `AAAA` 查询与实际访问

## 安装完成后的最小验收

- 能正常打开 `http://<MSM-IP>:7777`
- 执行 `msm status` 显示 MSM 主服务与已启用核心运行正常
- 主路由已将 DHCP DNS 指向 MSM，并添加了与 MSM 设置页一致的 FakeIP 路由
- 客户端 `nslookup google.com` 和 `dig AAAA google.com` 按已启用地址族返回对应 FakeIP

::: info 关于 FakeIP 默认网段
新安装默认配置值为 `28.0.0.1/8`（主路由静态路由通常写为 `28.0.0.0/8`）和合规的 IPv6 ULA 地址池 `fd42:4242:4242::/48`；历史安装可能仍使用 `f2b0::/18`。一切请以 MSM 设置页中的当前配置为准。
:::

## 常用运维命令（CLI 安装）

```bash
# 查看运行状态
msm status

# 查看服务日志（可附加 mosdns / mihomo / singbox）
msm logs

# 重启主服务或指定子服务
msm restart

# 系统环境一键诊断
msm doctor
```

## 下一步

- 还没完成初始化：[首次使用](/zh/guide/first-use)
- 准备配置路由器：[路由器集成总览](/zh/guide/router-integration)
- 想串联完整链路：[完整使用流程](/zh/guide/complete-workflow)
- 对照后台菜单找功能：[使用指南总览](/zh/guide/basic-config)
