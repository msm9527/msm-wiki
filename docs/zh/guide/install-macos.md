# macOS 安装

macOS 提供两种使用方式：**原生 macOS 桌面应用（推荐，需 macOS 26+）** 与 **命令行 CLI 版（兼容所有主流 macOS 版本）**。

## 方式一：原生 macOS 桌面应用（macOS 26+）

MSM 原生桌面客户端基于 **Swift 6 + SwiftUI（macOS 26 Liquid Glass）+ WKWebView** 构建，既可以托管本机 MSM LaunchDaemon 后台服务，也可以作为多服务器控制中心统一管理家里的 OpenWrt / Linux / Docker 节点。

### 主要特性

- **本机服务托管**：内置 `msm` 后端二进制与 LaunchDaemon 生命周期管理（安装、启停、重启、本机自签 HTTPS 健康检查、防降级同步与异常自动回滚）
- **多服务器侧边栏**：左侧原生侧边栏一键切换本机与多台远程 MSM 服务器，采用零重载多实例 WKWebView 池，切换不丢页面状态
- **菜单栏浮窗（Menu Bar）**：无需打开主窗口即可快速查看本机运行状态、启停服务或直达控制台
- **开机自启动**：通过 macOS 原生 `SMAppService` 管理登录项
- **内置在线更新**：基于 GitHub Releases 清单自动检测新版本，支持受限重定向流式下载、SHA-256 校验、安全解包与 `.app` 原子替换回滚

### 安装步骤

1. 前往 [正式版发布](/zh/guide/releases) 或 [Beta 版发布](/zh/guide/releases-beta) 页面，下载对应架构的 `.dmg` 安装包（Apple Silicon 选 `arm64`，Intel 选 `amd64`）
2. 双击 `.dmg`，将 **`msm-desktop.app`** 拖入「应用程序（`/Applications`）」目录
3. 首次打开前解除系统隔离属性（见下方提示），然后按指引完成本机服务安装或直接添加远程 MSM 服务器

::: warning 首次打开安全提示（Gatekeeper）
由于应用未经过 Apple 公证，macOS 首次启动可能弹窗提示“无法验证开发者”或“文件已损坏”。在终端执行以下命令清除下载隔离属性后再打开即可：

```bash
/usr/bin/xattr -dr com.apple.quarantine "/Applications/msm-desktop.app"
```

或在 **系统设置 → 隐私与安全性** 中点击「仍要打开」。发布包内嵌二进制的完整性与可执行性均在构建流水线中校验；如解除隔离后仍无法启动本机服务，请通过应用内日志查看详情并提交反馈。
:::

## 方式二：CLI 版（兼容 macOS 26 以下或无桌面环境）

适合希望纯终端/LaunchDaemon 运行、或系统版本低于 macOS 26 的用户。

### 一键安装脚本

```bash
# GitHub 官方源
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
```

国内网络加速镜像（稳定版直链，与仓库 `install_cn.sh` 同步）：

```bash
curl -fsSL https://msm.19930520.xyz/dl/install.sh | sudo bash
```

如需体验 Beta 版，将脚本替换为 `install_beta.sh` 或 `https://msm.19930520.xyz/dl/beta/install.sh`。

### 启动与访问

```bash
# 后台启动服务（或使用 msm serve 前台调试）
msm -d

# 查看状态
msm status
```

打开浏览器访问 `http://<MSM-IP>:7777` 完成初始化向导。

::: warning CLI 隔离属性提示
若通过浏览器手动下载压缩包解压运行，遇到 macOS 拦截时同样在二进制所在目录执行：

```bash
/usr/bin/xattr -dr com.apple.quarantine ./msm
```
:::

## 常用运维与排查

- **查看本机服务日志**：桌面端可直接在「本机服务控制台」查看日志；CLI 版可使用 `msm logs`
- **多服务器切换**：桌面端无需在本机启动 MSM 后端也能直接添加局域网或远程的 MSM Web 地址（支持 HTTP 与 HTTPS）
- **升级**：桌面端支持菜单内「检查更新」一键升级 `.app` 并自动同步本机 LaunchDaemon 二进制；CLI 版使用 `msm update` 或重新执行安装脚本

## 下一步

- [首次使用](/zh/guide/first-use)
- [路由器接入总览](/zh/guide/router-integration)
- [使用指南总览](/zh/guide/basic-config)
