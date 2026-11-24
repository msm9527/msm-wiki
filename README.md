# MSM Wiki

<div align="center">
  <img src="docs/public/logo/logo-square.svg" alt="MSM Logo" width="120" height="120">

  <h3>MSM 项目官方文档与发布仓库</h3>

  <p>面向家庭网络与自托管环境的统一管理平台（MosDNS / Clash / Sing-Box / Edge 网关 / 私有组网 / Docker Center）</p>

  <p>
    <a href="https://doc.msmbox.net/zh/">官方文档</a> •
    <a href="https://github.com/msm9527/msm-wiki/releases">版本发布</a> •
    <a href="https://doc.msmbox.net/zh/legal/">使用与合规</a>
  </p>
</div>

---

## 在线访问

- **官方文档**: https://doc.msmbox.net/zh/
- **版本下载**: https://github.com/msm9527/msm-wiki/releases
- **使用与合规**: https://doc.msmbox.net/zh/legal/
- **Telegram 公告频道**: https://t.me/msmwiki
- **Telegram 交流群**: https://t.me/msm_home

## 使用边界

MSM 是用于管理用户自有或已获授权设备的自托管网络与系统管理平台。项目不提供代理节点、订阅、网络线路或违法内容，请仅在合法与已授权的环境中使用。详情见 [使用与合规中心](https://doc.msmbox.net/zh/legal/)。

## 本地开发与验证

环境要求：Node.js 22+ 与 npm。

```bash
npm ci
npm run docs:dev      # 本地预览（默认 http://localhost:5173）
npm test              # 运行工作流、安装脚本、合规与术语自动化测试
npm run docs:build    # 构建静态站点（输出至 docs/.vitepress/dist）
npm run docs:preview  # 预览构建产物
```

站点通过 `.github/workflows/deploy.yml` 自动部署到 GitHub Pages（自定义域名定义在 `docs/public/CNAME`）。

## 目录结构

```text
msm-wiki/
├── docs/
│   ├── .vitepress/           # VitePress 配置与自定义主题（Terminal Blueprint）
│   ├── public/               # 静态资源（CNAME、Logo、截图、MSM Assistant 静态包）
│   └── zh/
│       ├── index.md          # 中文首页
│       ├── introduction/     # 项目介绍与核心特性
│       ├── guide/            # 安装、路由器接入、核心功能、Pro 模块、CLI/API 与版本发布
│       ├── faq/              # 常见问题与故障排查
│       └── legal/            # 合规使用、隐私安全、第三方软件与授权说明
├── scripts/                  # 发布摘要生成与版本页更新脚本
├── test/                     # Node 自动化回归测试套件
├── .github/
│   ├── workflows/            # Pages 部署、稳定版/Beta 发布、Docker/Agent 镜像、OpenWrt/PanaBit 打包
│   ├── openwrt/              # OpenWrt IPK/APK 与 LuCI 打包资产
│   ├── panabit/              # PanaBit APX 打包模板
│   ├── scripts/              # 镜像同步与版本清理辅助脚本
│   └── docs/                 # 维护者发布工作流与 AI 网关说明
├── Dockerfile.binary         # 官方 Docker Hub msmbox/msm 运行镜像构建定义
├── DOCKER.md                 # Docker 与 Docker Agent 部署说明
├── DOCKER_HUB_README.md      # Docker Hub 仓库简介
└── install*.sh               # Linux / Alpine 稳定版与 Beta 一键安装脚本
```

## 自动化发布说明

本仓库统一承载 MSM 稳定版、Beta 版、macOS 桌面端、OpenWrt 软件包、PanaBit 套件、Docker 主镜像（`msmbox/msm`）及独立 Docker Agent 镜像（`msmbox/msm-agent`）的发布与文档同步：

- [AI 网关配置指南](.github/docs/MODELSCOPE_API_GUIDE.md)
- [Release 工作流说明](.github/docs/RELEASE_WORKFLOW_GUIDE.md)
- [AI 网关测试脚本说明](.github/docs/TEST_API_README.md)

## 问题反馈与贡献

- 报告文档或发布包问题：[GitHub Issues](https://github.com/msm9527/msm-wiki/issues)
- 贡献文档请遵循现有中文目录结构，避免在公开文档和 Issue 中包含密码、Token、私钥或真实订阅链接。
