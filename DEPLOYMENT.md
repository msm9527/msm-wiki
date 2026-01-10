# MSM Wiki 部署指南

本文档说明如何将 MSM Wiki 部署到 GitHub Pages。

## 前置要求

1. GitHub 账号
2. 已创建 msm-wiki 仓库
3. 本地已安装 Node.js 和 npm

## 部署步骤

### 1. 推送代码到 GitHub

::: warning 重要
必须先推送代码，然后再启用 GitHub Pages！
:::

```bash
# 确保在 msm-wiki 目录
cd /Users/doumao/code/github/msm-wiki

# 查看状态
git status

# 推送到 GitHub
git push origin main
```

### 2. 启用 GitHub Pages

推送代码后，按以下步骤启用 GitHub Pages：

#### 步骤 1: 进入仓库设置

1. 访问仓库: https://github.com/msm9527/msm-wiki
2. 点击顶部的 **Settings** (设置) 标签

#### 步骤 2: 找到 Pages 设置

1. 在左侧菜单中向下滚动
2. 找到并点击 **Pages** 选项

#### 步骤 3: 配置 Source

1. 在 **Build and deployment** 部分
2. 找到 **Source** 下拉菜单
3. 选择 **GitHub Actions**

::: tip 提示
如果看不到 GitHub Actions 选项，请确保：
- 仓库是公开的（Public）
- 或者你有 GitHub Pro/Team/Enterprise 账号
:::

#### 步骤 4: 保存配置

配置会自动保存，无需点击保存按钮。

### 3. 触发首次部署

```bash
# 确保在 msm-wiki 目录
cd /Users/doumao/code/github/msm-wiki

# 查看状态
git status

# 推送到 GitHub
git push origin main
```

### 3. 查看部署进度

1. 进入仓库的 **Actions** 标签页
2. 查看 "Deploy Wiki to GitHub Pages" 工作流
3. 等待部署完成（通常需要 1-2 分钟）

### 4. 访问 Wiki

部署成功后，可以通过以下地址访问：

- **中文文档**: https://msm9527.github.io/msm-wiki/zh/
- **English Docs**: https://msm9527.github.io/msm-wiki/en/

## 本地开发

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

构建产物在 `docs/.vitepress/dist` 目录。

### 预览构建结果

```bash
npm run docs:preview
```

## 更新文档

### 1. 修改文档内容

编辑 `docs/zh/` 或 `docs/en/` 目录下的 Markdown 文件。

### 2. 本地预览

```bash
npm run docs:dev
```

### 3. 提交更改

```bash
git add .
git commit -m "更新文档：描述你的更改"
git push origin main
```

### 4. 自动部署

推送到 main 分支后，GitHub Actions 会自动触发部署。

## 添加新页面

### 1. 创建 Markdown 文件

```bash
# 中文页面
touch docs/zh/guide/new-page.md

# 英文页面
touch docs/en/guide/new-page.md
```

### 2. 编写内容

```markdown
# 页面标题

页面内容...
```

### 3. 更新侧边栏配置

编辑 `docs/.vitepress/config.mts`，在 `sidebar` 配置中添加链接：

```typescript
sidebar: {
  '/zh/': [
    {
      text: '用户指南',
      items: [
        { text: '新页面', link: '/zh/guide/new-page' }
      ]
    }
  ]
}
```

### 4. 提交并推送

```bash
git add .
git commit -m "添加新页面：新页面标题"
git push origin main
```

## 自定义配置

### 修改网站标题

编辑 `docs/.vitepress/config.mts`:

```typescript
export default defineConfig({
  title: "你的标题",
  description: "你的描述",
  // ...
})
```

### 修改主题颜色

编辑 `docs/.vitepress/config.mts` 中的 `head` 配置：

```typescript
head: [
  ['meta', { name: 'theme-color', content: '#你的颜色' }],
  // ...
]
```

### 添加自定义样式

创建 `docs/.vitepress/theme/custom.css` 并在主题配置中引入。

## 故障排查

### 构建失败

**问题**: GitHub Actions 构建失败

**解决方案**:
1. 检查 Actions 日志查看错误信息
2. 确保本地构建成功: `npm run docs:build`
3. 检查 Markdown 语法是否正确
4. 确保所有链接有效

### 页面 404

**问题**: 访问页面出现 404

**解决方案**:
1. 检查文件路径是否正确
2. 确保文件已提交到仓库
3. 检查 `base` 配置是否正确（应该是 `/`）
4. 清除浏览器缓存

### 样式不正常

**问题**: 页面样式显示异常

**解决方案**:
1. 清除浏览器缓存
2. 检查 logo 文件是否存在
3. 重新构建: `npm run docs:build`
4. 检查控制台是否有错误

### 搜索不工作

**问题**: 搜索功能无法使用

**解决方案**:
1. 确保使用的是 `local` 搜索提供商
2. 重新构建项目
3. 清除浏览器缓存

## 维护建议

### 定期更新

1. **更新依赖包**:
   ```bash
   npm update
   ```

2. **检查安全漏洞**:
   ```bash
   npm audit
   npm audit fix
   ```

### 文档质量

1. 保持文档与代码同步
2. 及时修复死链接
3. 添加清晰的示例代码
4. 使用截图辅助说明

### SEO 优化

1. 使用描述性的页面标题
2. 添加合适的 meta 描述
3. 使用清晰的 URL 结构
4. 添加内部链接

## 高级配置

### 自定义域名

1. 在仓库根目录创建 `CNAME` 文件
2. 添加你的域名: `wiki.yourdomain.com`
3. 在域名提供商处添加 CNAME 记录指向 `msm9527.github.io`
4. 推送更改

### 添加 Google Analytics

编辑 `docs/.vitepress/config.mts`:

```typescript
export default defineConfig({
  head: [
    ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID' }],
    ['script', {}, `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'GA_MEASUREMENT_ID');
    `]
  ]
})
```

## 相关资源

- [VitePress 官方文档](https://vitepress.dev/)
- [Markdown 语法指南](https://www.markdownguide.org/)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

## 获取帮助

如果遇到问题：

1. 查看 [GitHub Issues](https://github.com/msm9527/msm-wiki/issues)
2. 在 [Discussions](https://github.com/msm9527/msm-wiki/discussions) 提问
3. 参考 VitePress 官方文档

---

最后更新: 2026-01-10
