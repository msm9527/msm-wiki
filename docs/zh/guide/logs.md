# 日志查看

日志页面支持按服务筛选、实时查看与级别过滤，适用于排查启动失败、规则不生效等问题。

## 支持的日志来源

- MSM
- MosDNS
- Sing-Box
- Mihomo（内部服务名：`mihomo`）

## 常见操作

- 切换服务类型查看对应日志
- 按日志级别过滤（INFO/WARN/ERROR/DEBUG）
- 暂停/恢复实时日志流

## 排查建议

- DNS 解析异常：优先查看 **MosDNS** 日志
- 代理连通问题：先确认当前活动核心，再查看 **Mihomo / Sing-Box** 日志
- 服务无法启动：查看 **MSM** 日志与系统诊断
- 核心切换失败：结合代理切换进度中的失败阶段查看目标核心与 MSM 日志
- 域名、Cloudflare、组网或 Docker 异常：优先从各模块的状态、事件和诊断入口开始，再回到 MSM 日志

日志可能包含域名、内网地址和运行参数。分享前先脱敏，不要粘贴 Token、私钥、订阅地址或回家密码。

## 下一步

- [统一代理服务](/zh/guide/proxy)
- [系统诊断](/zh/guide/diagnostics)
- [网络工具](/zh/guide/network-tools)
