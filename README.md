# MSM Wiki

<div align="center">
  <img src="docs/public/logo/logo-square.svg" alt="MSM Logo" width="120" height="120">

  <h3>MSM 项目官方文档</h3>

  <p>Mosdns Singbox Mihomo Manager - 统一管理平台文档</p>

  <p>
    <a href="https://msm9527.github.io/msm-wiki/zh/">中文文档</a> •
    <a href="https://msm9527.github.io/msm-wiki/en/">English Docs</a>
  </p>
</div>

---

## 📖 关于

这是 MSM (Mosdns Singbox Mihomo Manager) 项目的官方文档站点，提供完整的使用指南、API 文档和部署说明。

## 🌐 在线访问

- **中文文档**: https://msm9527.github.io/msm-wiki/zh/
- **English Docs**: https://msm9527.github.io/msm-wiki/en/

## 🚀 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run docs:dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
npm run docs:build
```

### 预览构建结果

```bash
npm run docs:preview
```

## 📁 目录结构

```
msm-wiki/
├── docs/
│   ├── .vitepress/
│   │   └── config.mts          # VitePress 配置
│   ├── public/
│   │   └── logo/               # Logo 资源
│   ├── zh/                     # 中文文档
│   │   ├── index.md            # 首页
│   │   ├── introduction/       # 介绍
│   │   ├── guide/              # 用户指南
│   │   ├── api/                # API 文档
│   │   ├── deployment/         # 部署指南
│   │   ├── development/        # 开发指南
│   │   └── faq/                # 常见问题
│   └── en/                     # 英文文档
│       └── ...                 # 同中文结构
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 部署配置
├── package.json
└── README.md
```

## 📝 文档内容

### 介绍
- 什么是 MSM
- 核心特性
- 架构设计
- 技术栈

### 快速开始
- 安装部署
- 基础配置
- 首次使用

### 用户指南
- 用户管理
- MosDNS 管理
- SingBox 管理
- Mihomo 管理
- 配置编辑
- 历史记录与回滚
- 日志查看

### API 文档
- API 概览
- 认证接口
- 用户接口
- 服务管理接口
- 配置管理接口
- 历史记录接口
- WebSocket 接口

### 部署指南
- 单机部署
- Docker 部署
- Systemd 配置
- Nginx 配置
- HTTPS 配置

### 开发指南
- 开发环境搭建
- 项目结构
- 前端开发
- 后端开发
- 贡献指南

## 🤝 贡献文档

欢迎贡献文档内容！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingDoc`)
3. 提交你的修改 (`git commit -m '添加某某文档'`)
4. 推送到分支 (`git push origin feature/AmazingDoc`)
5. 创建一个 Pull Request

## 📋 文档规范

- 使用 Markdown 格式
- 中文文档放在 `docs/zh/` 目录
- 英文文档放在 `docs/en/` 目录
- 图片资源放在 `docs/public/` 目录
- 遵循现有的目录结构和命名规范
- 保持文档简洁清晰，易于理解

## 🛠️ 技术栈

- [VitePress](https://vitepress.dev/) - 静态站点生成器
- [Vue 3](https://vuejs.org/) - 前端框架
- [GitHub Pages](https://pages.github.com/) - 托管平台
- [GitHub Actions](https://github.com/features/actions) - 自动部署


## 🔗 相关链接

- [问题反馈](https://github.com/msm9527/msm-wiki/issues) - 报告文档问题
- [讨论区](https://github.com/msm9527/msm-wiki/discussions) - 讨论交流

---

<div align="center">
  Made with ❤️ by MSM Team
</div>
