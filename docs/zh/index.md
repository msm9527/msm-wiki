---
layout: home

hero:
  name: "MSM"
  text: "统一管理平台"
  tagline: 一站式管理 MosDNS、SingBox、Mihomo 的可视化平台
  image:
    src: /logo/logo-square.svg
    alt: MSM Logo
  actions:
    - theme: brand
      text: 一键安装
      link: /zh/guide/install
    - theme: alt
      text: 查看文档
      link: /zh/introduction/what-is-msm
    - theme: alt
      text: GitHub Releases
      link: https://github.com/msm9527/msm-wiki/releases/latest

features:
  - icon: 🚀
    title: 一键部署
    details: 支持单二进制部署，无需复杂配置，开箱即用
  - icon: 🎨
    title: 现代化界面
    details: 基于 React + TailwindCSS 构建，美观流畅的用户体验
  - icon: 🔐
    title: 权限管理
    details: 完善的用户权限体系，支持多角色管理
  - icon: ⚡
    title: 实时监控
    details: WebSocket 实时推送服务状态和日志信息
  - icon: 📝
    title: 配置管理
    details: 在线编辑配置，支持历史版本回滚
  - icon: 🔄
    title: 多内核支持
    details: 支持切换不同版本的内核和配置
  - icon: 🌐
    title: 双语支持
    details: 完整的中英文界面，国际化支持
  - icon: 🛡️
    title: 安全可靠
    details: JWT 认证、HTTPS 支持、操作审计
---

## 什么是 MSM？

MSM (Mosdns Singbox Mihomo Manager) 是一个统一管理 **MosDNS**、**SingBox**、**Mihomo** 的可视化平台。通过 Web 界面一键安装、启动、停止、卸载和配置三大核心网络服务，以现代化的方式取代传统脚本式管理。

## 核心特性

- **统一管理**: 在一个平台管理所有服务
- **可视化操作**: 直观的 Web 界面，无需命令行
- **配置编辑**: 内置 Monaco 编辑器，支持语法高亮
- **历史回滚**: 自动保存配置历史，一键回滚
- **实时监控**: 实时查看服务状态和日志
- **权限控制**: 多级权限管理，安全可靠

## 快速开始

### 一键安装（推荐）

::: tip root 用户提示
如果你已经是 root 用户，可以省略 `sudo`，直接运行：
```bash
# 使用 curl
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash
```
:::

```bash
# 使用 curl 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
```

::: tip 国内加速
如果 GitHub 访问速度较慢，推荐使用加速镜像（如 curl 连接失败可改用 wget 或切换其他镜像）：
```bash
# 普通用户
curl -fsSL https://edgeone.gh-proxy.org/https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# root 用户
curl -fsSL https://edgeone.gh-proxy.org/https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash
```
更多镜像选项请查看[详细安装教程](/zh/guide/install)。
如脚本内下载 release 失败，可设置 MSM_GITHUB_PROXY 或 GITHUB_PROXY 后重试。
:::

安装完成后访问 `http://your-server-ip:7777`

::: tip 首次使用
首次访问时需要创建管理员账号，请妥善保管账号密码。
:::

### 手动安装

```bash
# 下载最新版本（以 0.7.1 为例，请替换为实际版本号）
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.1-linux-amd64.tar.gz

# 解压
tar -xzf msm-0.7.1-linux-amd64.tar.gz

# 添加执行权限
chmod +x msm

# 运行
./msm
```

访问 `http://localhost:7777` 即可使用。

查看 [详细安装教程](/zh/guide/install) 了解更多安装方式和配置选项。

## 技术栈

- **前端**: React 18
- **后端**: Golang

## 社区

- [GitHub Issues](https://github.com/msm9527/msm-wiki/issues) - 报告问题
