# Linux 安装

适用于常见 Linux 发行版（Debian/Ubuntu/CentOS/RHEL/Alpine 等）。一键脚本会自动识别架构与 libc 类型。

## 适用范围

- **架构**：amd64、arm64（脚本自动识别）
- **libc**：glibc / musl
- **服务管理**：优先使用 systemd，检测不到则提示手动启动

## 一键安装（推荐）

### 使用官方脚本

```bash
# curl
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
# root 用户
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash

# 或 wget
wget -qO- https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
# root 用户
wget -qO- https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash
```

### 指定版本安装

```bash
MSM_VERSION=0.7.7 curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
MSM_VERSION=0.7.7 curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash
```

### 国内网络加速（可选）

```bash
# 稳定版国内镜像脚本（等价于 install_cn.sh）
# curl（sudo）
curl -fsSL https://msm.19930520.xyz/dl/install.sh | sudo bash
# root 用户
curl -fsSL https://msm.19930520.xyz/dl/install.sh | bash

# wget（sudo）
wget -qO- https://msm.19930520.xyz/dl/install.sh | sudo bash
# root 用户
wget -qO- https://msm.19930520.xyz/dl/install.sh | bash
```

> `https://msm.19930520.xyz/dl/install.sh` 为国内镜像稳定版脚本直链，和仓库中的 `install_cn.sh` 同步。

## 脚本会做什么

- 检测系统与架构（amd64/arm64）
- 自动选择 glibc / musl 构建
- 下载并安装到 `/usr/local/bin/msm`
- 安装并启动 systemd 服务（如系统支持）
- 检测 53 端口冲突，并在 Linux + systemd 环境下按当前运行方式处理
- 打开常用端口并输出访问地址

## 验证安装

```bash
msm status
msm logs
```

浏览器访问：`http://<MSM-IP>:7777`

## 常见问题

- **非 systemd 系统**：按提示手动启动 `msm -d`
- **53 端口冲突**：交互运行会先提示再询问是否自动处理；非交互运行（如 `curl | bash`）会在提示后默认自动处理。非 systemd 系统请手动释放端口

发布包会先通过 `SHA256SUMS` 校验，校验清单缺失或不匹配时不会继续安装。

## 下一步

- [路由器集成](/zh/guide/router-integration)
- [首次使用](/zh/guide/first-use)
