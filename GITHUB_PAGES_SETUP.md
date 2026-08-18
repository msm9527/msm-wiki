# GitHub Pages 启用指南

## 错误说明

如果你看到以下错误：
```
Error: Get Pages site failed. Please verify that the repository has Pages enabled
```

这表示 GitHub Pages 还没有启用。请按以下步骤操作。

## 启用步骤

### 第一步：推送代码

**必须先推送代码到 GitHub！**

```bash
cd /Users/doumao/code/github/msm-wiki
git push origin main
```

### 第二步：启用 GitHub Pages

1. **访问仓库设置**
   - 打开 https://github.com/msm9527/msm-wiki
   - 点击顶部的 **Settings** 标签

2. **找到 Pages 选项**
   - 在左侧菜单中找到 **Pages**
   - 点击进入 Pages 设置页面

3. **配置 Source**
   - 在 **Build and deployment** 部分
   - **Source** 下拉菜单选择 **GitHub Actions**
   - 配置会自动保存

4. **配置自定义域名**
   - 在 **Custom domain** 中填写 `doc.msmbox.net` 并保存
   - 在 DNS 服务商添加 `CNAME` 记录：`doc` 指向 `msm9527.github.io`
   - CNAME 目标不要附加 `/msm-wiki` 路径
   - DNS 检查通过后启用 **Enforce HTTPS**

5. **等待部署**
   - 返回仓库首页
   - 点击 **Actions** 标签
   - 查看 "Deploy Wiki to GitHub Pages" 工作流
   - 等待绿色勾号（表示成功）

### 第三步：访问 Wiki

部署成功后，访问：
- https://doc.msmbox.net/zh/ （中文）
- https://doc.msmbox.net/en/ （英文）

## 常见问题

### Q: 看不到 GitHub Actions 选项？

**A:** 确保：
- 仓库是公开的（Public）
- 或者你有 GitHub Pro/Team/Enterprise 账号

### Q: 部署失败？

**A:** 检查：
1. Actions 标签页的错误日志
2. 确保 package-lock.json 文件已提交
3. 确保 .github/workflows/deploy.yml 文件存在

### Q: 页面显示 404？

**A:**
1. 等待 2-3 分钟让部署完成
2. 清除浏览器缓存
3. 检查 Actions 是否成功部署

## 截图参考

### Settings 页面
在仓库页面点击 Settings：
```
[仓库名] > Settings
```

### Pages 设置
在左侧菜单找到 Pages：
```
Settings > Pages > Source: GitHub Actions
```

### Actions 页面
查看部署状态：
```
[仓库名] > Actions > Deploy Wiki to GitHub Pages
```

## 需要帮助？

如果遇到问题：
1. 查看 [GitHub Pages 文档](https://docs.github.com/en/pages)
2. 查看 [VitePress 部署文档](https://vitepress.dev/guide/deploy)
3. 提交 [Issue](https://github.com/msm9527/msm-wiki/issues)
