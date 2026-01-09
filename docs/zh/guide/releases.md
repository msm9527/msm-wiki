# 📦 版本发布

<div style="text-align: center; margin: 2rem 0;">
  <p style="font-size: 1.1rem; color: var(--vp-c-text-2);">
    查看 MSM 的版本更新历史和发布说明
  </p>
</div>

---

## 🚀 最新版本

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; border-radius: 12px; color: white; margin: 2rem 0;">
  <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h3 style="margin: 0; color: white; font-size: 2rem;">v0.7.5</h3>
      <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">发布日期：2024-12-15 14:30</p>
    </div>
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
      <a href="https://github.com/msm9527/msm-wiki/releases/tag/0.7.5" target="_blank" style="background: white; color: #667eea; padding: 0.5rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
        📥 下载
      </a>
      <a href="https://github.com/msm9527/msm-wiki/releases/tag/0.7.5" target="_blank" style="background: rgba(255,255,255,0.2); color: white; padding: 0.5rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
        📝 查看详情
      </a>
    </div>
  </div>
</div>

::: tip ✨ 新增功能
**UI 全面升级**
- 🎨 登录与 Setup 页 UI 全量重制：左右分栏、动画 Logo、统一配色与文案
- 🌍 Setup 界面时区设置更改系统全局
- 📦 登录页依赖裁剪、无用组件移除，前端包体减小

**性能优化**
- ⚡ 时区���步流程改为非阻塞，降低启动卡顿
- 🧹 同步方案包清理为历史
:::

::: info 🐛 问题修复
- ✅ 修复移动端动画效果问题
- ✅ 登录页布局/文案细节与未使用引用清理
- ✅ 时区应用异常对运行的影响降级为警告
:::

::: warning 🧪 实验性功能
- 🔧 Mihomo 规则/Provider 编辑器继续迭代：多处交互微调与默认值完善
- 🔄 系统升级 Mihomo 会进行自动配置合并
- 🔄 系统升级 MosDNS 会进行配置自动升级
:::

---

## 📚 历史版本

<details>
<summary><strong>v0.7.4</strong> - 2024-11-20 10:15 <Badge type="info" text="稳定版" /></summary>

<div style="padding: 1rem; background: var(--vp-c-bg-soft); border-radius: 8px; margin-top: 1rem;">

**版本链接**: [GitHub Release](https://github.com/msm9527/msm-wiki/releases/tag/0.7.4)

**✨ 新增功能**
- 🔧 **Mihomo 规则管理增强**
  - 规则页按配置文件排序、快速定位编辑
  - 规则/Provider 可选重启生效
  - 默认 interval 调整

- ⚙️ **Setup 流程优化**
  - 保存流程带下载进度提示
  - 支持运行期切换代理核心并自动下载缺失核心

- 📋 **项目管理**
  - Issue 模板新增
  - VPS 预设配置加入 Mihomo

- 📥 **下载优化**
  - CLI/下载链路默认优先内置加速源
  - 用户界面增加进度提示

**🐛 问题修复**
- ✅ Mihomo 规则编辑器初始化报错、弹窗越界、空 `{}` YAML 破坏等
- ✅ 前端启停代理、日志级别解析、Toast 长文本、导航高亮等 UI/交互问题
- ✅ 多处版本号、路径、配置读取错位（尤其 Setup 与缓存）

**⚠️ 注意事项**
- Tauri 桌面链路已基本稳定，但仍建议在 macOS 上验证 launchctl 工作目录及权限场景

</div>
</details>

<details>
<summary><strong>v0.7.3</strong> - 2024-10-28 16:45</summary>

<div style="padding: 1rem; background: var(--vp-c-bg-soft); border-radius: 8px; margin-top: 1rem;">

**版本链接**: [GitHub Release](https://github.com/msm9527/msm-wiki/releases/tag/0.7.3)

**✨ 新增功能**
- 🔄 **Connections 页面重做**
  - 弹窗模式：保持展开状态、更紧凑布局
  - 测速/展开可并存

- 🔗 **代理链展示优化**
  - 切换操作不再折叠，补充测速
  - 规则页节点卡新增图标、双列瀑布流布局

- ⚙️ **Setup 优化**
  - 初始化与版本号管理多处微调

**🐛 问题修复**
- ✅ IPv6/DNS 开关保存与读取旧配置问题
- ✅ Mihomo 页面若干弹窗居中、溢出与 YAML 处理错误
- ✅ 白屏/布局跳动等细碎 UI 问题

**⚠️ 注意事项**
- 桌面端与 SSE 改造已初步落地，仍属快速演进期，建议升级时验证 SSE 长连接稳定性

</div>
</details>

<details>
<summary><strong>v0.7.2</strong> - 2024-09-15 09:20</summary>

<div style="padding: 1rem; background: var(--vp-c-bg-soft); border-radius: 8px; margin-top: 1rem;">

**版本链接**: [GitHub Release](https://github.com/msm9527/msm-wiki/releases/tag/0.7.2)

**✨ 核心内容**
- 🖥️ **桌面端服务管理**
  - 桌面端服务管理与托盘初版
  - 自动安装/提权、首次运行门禁、状态面板

- 🎨 **UI 优化**
  - MosDNS/Mihomo UI 大幅优化
  - SSE 相对路径、CORS、静态资源与代理概览链路梳理

- 🐛 **问题修复**
  - 大量 macOS DMG、权限、服务检测问题修复
  - Connections 刷新/测速/展开等问题修复

</div>
</details>

---

## 🔄 升级建议

::: warning 升级前准备
1. 升级前建议进行备份，避免漏过资源/配置迁移
2. 桌面端（Tauri）用户：升级后确认 launchctl/托盘服务状态与本地 API 可访问性
3. Mihomo 规则/Provider 编辑器自 0.7.3 快速演进，升级后建议备份并复核生成的 YAML
:::

### 📖 如何升级

详细的升级步骤请参考 [更新升级指南](/zh/guide/update)。

### 🔗 版本兼容性

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin: 1rem 0;">
  <div style="padding: 1rem; background: var(--vp-c-bg-soft); border-radius: 8px; border-left: 4px solid #10b981;">
    <div style="font-weight: 600; margin-bottom: 0.5rem;">✅ 直接升级</div>
    <div style="font-size: 0.9rem; color: var(--vp-c-text-2);">0.7.x 系列版本之间可以直接升级</div>
  </div>
  <div style="padding: 1rem; background: var(--vp-c-bg-soft); border-radius: 8px; border-left: 4px solid #3b82f6;">
    <div style="font-weight: 600; margin-bottom: 0.5rem;">🔄 自动迁移</div>
    <div style="font-size: 0.9rem; color: var(--vp-c-text-2);">配置文件会自动迁移和合并</div>
  </div>
  <div style="padding: 1rem; background: var(--vp-c-bg-soft); border-radius: 8px; border-left: 4px solid #f59e0b;">
    <div style="font-weight: 600; margin-bottom: 0.5rem;">💾 定期备份</div>
    <div style="font-size: 0.9rem; color: var(--vp-c-text-2);">建议定期备份配置文件</div>
  </div>
</div>

---

## 💬 获取帮助

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0;">
  <a href="/zh/faq/" style="padding: 1.5rem; background: var(--vp-c-bg-soft); border-radius: 8px; text-decoration: none; color: inherit; transition: transform 0.2s; display: block;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
    <div style="font-size: 2rem; margin-bottom: 0.5rem;">❓</div>
    <div style="font-weight: 600; margin-bottom: 0.5rem;">常见问题</div>
    <div style="font-size: 0.9rem; color: var(--vp-c-text-2);">查看常见问题解答</div>
  </a>
  <a href="/zh/faq/troubleshooting" style="padding: 1.5rem; background: var(--vp-c-bg-soft); border-radius: 8px; text-decoration: none; color: inherit; transition: transform 0.2s; display: block;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔧</div>
    <div style="font-weight: 600; margin-bottom: 0.5rem;">故障排查</div>
    <div style="font-size: 0.9rem; color: var(--vp-c-text-2);">解决常见技术问题</div>
  </a>
  <a href="https://github.com/msm9527/msm-wiki/issues" target="_blank" style="padding: 1.5rem; background: var(--vp-c-bg-soft); border-radius: 8px; text-decoration: none; color: inherit; transition: transform 0.2s; display: block;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🐛</div>
    <div style="font-weight: 600; margin-bottom: 0.5rem;">提交问题</div>
    <div style="font-size: 0.9rem; color: var(--vp-c-text-2);">在 GitHub 上报告问题</div>
  </a>
</div>
