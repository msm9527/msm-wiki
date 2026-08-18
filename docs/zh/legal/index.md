---
title: 使用与合规中心
description: MSM 的产品定位、使用边界、隐私安全、免责声明与知识产权说明
outline: deep
---

# 使用与合规中心

> 版本：`1.0` · 更新日期：2026 年 8 月 18 日

::: info 产品定位
MSM 是用于管理用户自有或已获授权设备的自托管网络与系统管理平台。它将 DNS、代理核心、域名服务、远程接入、Docker 运维和网络诊断统一到管理界面，不是网络接入服务、代理节点或内容提供服务。
:::

## 先说清楚四件事

1. **工具属性不决定使用结果**：DNS、路由、反向代理、隧道、端口检测等都是中性网络技术，是否合法取决于用户的地区、目的、数据、授权和具体操作。
2. **只管理有权管理的资产**：使用 MSM 扫描、访问、发布或修改任何设备、域名、网络、账号或数据前，必须拥有所有权或明确授权。
3. **用户是自己部署的责任人**：用户决定配置、数据源、第三方服务和网络目标，也应负责账号、密钥、日志、备份、访问控制及当地合规。
4. **免责不等于排除法定责任**：项目会在适用法律允许的范围内说明产品风险和责任边界，但不会声称可以排除不得排除的法定责任。

## 文档导航

| 文档 | 解决什么问题 |
| --- | --- |
| [合规使用规范](/zh/legal/acceptable-use) | 哪些场景可以使用，哪些行为明确禁止 |
| [隐私与数据安全](/zh/legal/privacy-security) | 文档站与自托管 MSM 分别可能处理哪些数据 |
| [免责声明](/zh/legal/disclaimer) | 配置、中断、数据、第三方服务和责任限制 |
| [知识产权说明](/zh/legal/intellectual-property) | 自研代码、文档、Logo、截图、交互设计与第三方组件的权利边界 |

## 合法合规的典型用法

- 管理自己的家庭网络、实验环境、服务器或 Docker 资源
- 在组织明确授权的范围内进行 DNS、路由、端口和连通性诊断
- 为自有域名、证书和 Web 服务配置 DDNS 与反向代理
- 为自有设备建立经过身份验证和加密的远程访问
- 将自己合法获取的配置、规则和订阅接入兼容组件

## 官方边界与链接

- 官方文档域名：[https://doc.msmbox.net/](https://doc.msmbox.net/)
- MSM 源代码仓库：[msm9527/msm](https://github.com/msm9527/msm)
- Wiki 仓库：[msm9527/msm-wiki](https://github.com/msm9527/msm-wiki)
- 官方版本发布：[msm-wiki Releases](https://github.com/msm9527/msm-wiki/releases)
- Telegram 公告频道：[msmwiki](https://t.me/msmwiki)
- Telegram 交流群：[msm_home](https://t.me/msm_home)

::: warning 识别非官方内容
第三方镜像、教程、配置、二次打包和群组言论不当然代表 MSM 项目。安装前请核对域名、仓库、发布者和校验信息。
:::

## 在中国境内使用时

用户应根据自己的部署方式、业务类型、数据类型和网络范围识别实际适用的法律法规。以下链接仅作入口，不是穷尽清单：

- [《中华人民共和国网络安全法》](https://flk.npc.gov.cn/detail?fileId=&id=021e7d7684474107b8f3febbb1c4f8b5&title=%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E7%BD%91%E7%BB%9C%E5%AE%89%E5%85%A8%E6%B3%95&type=)
- [《中华人民共和国数据安全法》](https://www.miit.gov.cn/zwgk/zcwj/flfg/art/2022/art_284b390b84484f10b0e43eeafaad0f6d.html)
- [《中华人民共和国个人信息保护法》](https://www.miit.gov.cn/zwgk/zcwj/flfg/art/2022/art_04a0f1fb5df244e39688fd5372623a8d.html)
- [《中华人民共和国著作权法》](https://flk.npc.gov.cn/detail?fileId=&id=ff808081752b7d430175e4766bab1557&title=%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E8%91%97%E4%BD%9C%E6%9D%83%E6%B3%95&type=)

法律、监管要求和服务条款可能变化。对于生产、商业、教育、医疗、金融、关键基础设施或处理他人数据的部署，应在上线前获得合格专业人士的针对性意见。

## 更新与反馈

上述文档会随功能、部署架构、第三方服务或法律环境变化而修订。如果发现陈述与当前版本不符，请在 [GitHub Issues](https://github.com/msm9527/msm-wiki/issues) 提交可公开的修订建议；请勿在公开 Issue 中提交密码、Token、私钥、订阅地址或未脱敏日志。

