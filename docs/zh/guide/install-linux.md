# Linux 安装

适用于常见 Linux 发行版（Debian / Ubuntu / CentOS / Rocky / Fedora / Arch / Alpine 等）。一键脚本会自动识别 CPU 架构与 `glibc` / `musl` 类型，并校验发布包 `SHA256SUMS`。

## 适用范围

- **支持架构**：`amd64`、`amd64-v3`（支持 AVX2 的现代 x86_64 CPU）、`arm64`、`armv7`、`armv6`
- **C 运行库**：自动识别 `glibc` 与 `musl`（静态构建）
- **服务管理**：自动支持 `systemd`，OpenRC / procd 环境请参考 [Alpine 安装](/zh/guide/install-alpine) 或 [OpenWrt 安装](/zh/guide/install-openwrt)

## 一键安装（推荐）

### 稳定版（GitHub 官方源）

```bash
# sudo 用户
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# root 用户
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash
```

也可以使用 `wget`：

```bash
wget -qO- https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
```

### 稳定版（国内镜像加速）

`https://msm.19930520.xyz/dl/install.sh` 与仓库中的 `install_cn.sh` 同步，适合国内服务器或家庭软路由：

```bash
# sudo 用户
curl -fsSL https://msm.19930520.xyz/dl/install.sh | sudo bash

# root 用户
curl -fsSL https://msm.19930520.xyz/dl/install.sh | bash
```

### Beta 体验版

如需体验最新功能（如 OpenWrt 集成改进、新模块预览）：

```bash
# GitHub 官方源（Beta）
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install_beta.sh | sudo bash

# 国内镜像源（Beta，与 install_beta_cn.sh 同步）
curl -fsSL https://msm.19930520.xyz/dl/beta/install.sh | sudo bash
```

### 指定版本或自定义配置目录

可通过环境变量固定版本或更改默认数据目录（默认配置目录为 `/root/.msm` 或当前用户 `~/.msm`，系统服务安装时按提示写入）：

```bash
# 安装指定版本（示例：2.2.8）
MSM_VERSION=2.2.8 curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# 自定义配置与数据目录
MSM_CONFIG_DIR=/opt/msm curl -fsSL https://msm.19930520.xyz/dl/install.sh | sudo bash
```

## 脚本会做什么

1. 检测操作系统、CPU 架构与 `glibc` / `musl`
2. 下载目标发布包并强制核对 `SHA256SUMS`（校验清单缺失或不匹配时会中止安装）
3. 安装二进制到 `/usr/local/bin/msm`
4. 在支持 `systemd` 的系统上自动注册并启动 `msm.service`
5. 检测 `53` 端口占用（如 `systemd-resolved`）并按交互或非交互策略安全处理
6. 输出本机管理访问地址

## 验证安装

```bash
msm status
msm doctor
msm logs
```

打开浏览器访问 `http://<MSM-IP>:7777` 进入初始化向导。

## 常见问题

- **非 `systemd` 系统**：安装完成后可执行 `msm service install --manager openrc`（Alpine）或使用 `msm serve -d` 后台启动。
- **53 端口冲突**：交互终端会提示确认后再处理；管道非交互安装（`curl | bash`）会在提示后自动处理常见 `systemd-resolved` 占用。如不慎影响宿主机 DNS，可随时执行 `sudo msm service recover-dns` 恢复。
- **升级或卸载**：日常升级可在 Web 后台 **系统更新** 或运行 `msm update install`；彻底卸载可在 Web 后台 **系统设置** 或执行 `sudo msm service uninstall`。

## 下一步

- [首次使用](/zh/guide/first-use)
- [路由器接入总览](/zh/guide/router-integration)
- [CLI 命令参考](/zh/guide/cli)
