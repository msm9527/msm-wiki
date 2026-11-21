# macOS 安装

macOS 支持 **CLI 版** 与 **桌面版**（若发布提供）。

## 方式一：CLI 版（推荐）

```bash
# 使用 curl
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
```

### 国内网络加速（可选）

```bash
# 国内镜像稳定版脚本直链（等价于 install_cn.sh）
curl -fsSL https://msm.19930520.xyz/dl/install.sh | sudo bash
```

> `https://msm.19930520.xyz/dl/install.sh` 为国内镜像稳定版脚本直链，和仓库中的 `install_cn.sh` 同步。

安装后可使用：

```bash
msm -d
```

访问地址：`http://<MSM-IP>:7777`

::: warning 安全提示（CLI）
由于二进制未经过 Apple 公证，macOS 可能拦截首次运行，或提示“文件已损坏/无法打开”。请在 `msm` 所在目录执行以下命令解除隔离属性：

```bash
/usr/bin/xattr -cr msm
```
:::

## 方式二：桌面版（可选，需 macOS 26+）

1. 打开 Releases 页面下载 macOS 安装包（按 Intel / Apple Silicon 选择）
2. 打开 `.dmg` 并拖拽到 Applications
3. 若被系统阻止，请在 **系统设置 > 隐私与安全性** 中允许

> 原生 SwiftUI 桌面版需要 **macOS 26（Tahoe）或更高版本**，内置服务管理与在线更新能力；较旧版本 macOS 请使用上方的 CLI 版。

::: warning 安全提示
由于应用未经过 Apple 公证，macOS 可能拦截首次打开，或提示“文件已损坏/无法打开”。请执行以下命令解除隔离属性：

```bash
/usr/bin/xattr -cr "/Applications/msm-desktop.app"
```

该命令仅用于处理 macOS Gatekeeper/隔离属性拦截；发布包内置后端的签名和可执行性已在构建流程中校验。如果执行后仍无法安装服务，请下载最新版本并反馈错误日志。
:::

## 下一步

- [路由器集成](/zh/guide/router-integration)
- [首次使用](/zh/guide/first-use)
