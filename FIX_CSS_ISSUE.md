# 自定义域名资源路径说明

## 问题描述

访问 https://doc.msmbox.net/zh/ 时，如果继续使用原来的 `/msm-wiki/` 子路径，CSS、JavaScript 和图片会请求错误地址。

## 问题原因

VitePress 的 `base` 配置不正确。

- **错误配置**: `base: '/msm-wiki/'`
- **正确配置**: `base: '/'`

GitHub Pages 现在使用独立域名 `https://doc.msmbox.net/`，站点直接部署在域名根路径，静态资源不再使用 `/msm-wiki/` 前缀。

## 修复内容

修改了 `docs/.vitepress/config.mts` 文件：

```typescript
export default defineConfig({
  title: "MSM Wiki",
  description: "MSM Manager - 统一管理平台文档",
  base: '/',  // 自定义域名使用根路径

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo/favicon.svg' }],
    // ...
  ],
  // ...
})
```

## 修复步骤

1. ✅ 修改 `base` 配置
2. ✅ 修改 favicon 路径
3. ✅ 测试本地构建
4. ✅ 提交并推送到 GitHub

## 验证

等待 GitHub Actions 部署完成（约 2-3 分钟），然后访问：

- https://doc.msmbox.net/zh/
- https://doc.msmbox.net/zh/legal/

现在应该可以看到完整的 UI 和样式了。

## 查看部署进度

1. 访问 https://github.com/msm9527/msm-wiki/actions
2. 查看最新的 "Deploy Wiki to GitHub Pages" 工作流
3. 等待绿色勾号

## 相关提交

```
941e0c7 修复 CSS 和 UI 不显示的问题
```

## 技术说明

### 为什么需要 base 配置？

当 VitePress 站点部署在自定义域名根路径时，所有资源都应直接从根路径加载：

- CSS: `/assets/style.css`
- JS: `/assets/app.js`
- 图片: `/logo/logo.svg`

如果 `base` 仍配置为 `/msm-wiki/`，VitePress 会生成：
- CSS: `/msm-wiki/assets/style.css` ❌ (404)
- JS: `/msm-wiki/assets/app.js` ❌ (404)

如果 `base` 配置为 `/`，VitePress 会生成：
- CSS: `/assets/style.css` ✅
- JS: `/assets/app.js` ✅

### 本地开发

本地开发时，访问 `http://localhost:5173/` 即可看到正确的效果。

### 自定义域名

当前自定义域名为 `doc.msmbox.net`，GitHub Pages 中的 Custom domain 必须与此值保持一致。

## 总结

这是一个常见的静态站点部署问题。关键是要确保 `base` 配置与实际部署路径一致。

现在问题已经修复，wiki 应该可以正常显示了！🎉
