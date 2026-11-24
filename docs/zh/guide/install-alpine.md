# Alpine 安装

Alpine Linux 使用 `musl` C 库和 **OpenRC** 服务管理器。MSM 提供原生的 `musl` 静态构建与内置 OpenRC 托管命令，无需手写启动脚本。

## 依赖准备

Alpine 默认未预装 Bash 和 `curl`，先安装基础依赖：

```bash
apk add --no-cache bash curl ca-certificates
```

## 一键安装

### 官方源

```bash
# root 用户
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash

# sudo 用户
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
```

### 国内镜像加速（可选）

```bash
# 稳定版国内镜像直链（与 install_cn.sh 同步）
curl -fsSL https://msm.19930520.xyz/dl/install.sh | bash

# Beta 版国内镜像直链（与 install_beta_cn.sh 同步）
curl -fsSL https://msm.19930520.xyz/dl/beta/install.sh | bash
```

脚本会自动识别 `musl` 与目标架构，并在通过 `SHA256SUMS` 校验后安装 `/usr/local/bin/msm`。

## 注册为 OpenRC 服务（开机自启）

MSM 内置 OpenRC 服务管理支持，一键即可生成 `/etc/init.d/msm` 并加入默认运行级别：

```bash
# root 用户
msm service install --manager openrc
rc-service msm start

# sudo 用户
sudo msm service install --manager openrc
sudo rc-service msm start
```

日常管理命令：

```bash
rc-service msm status
rc-service msm restart
rc-service msm stop

# 卸载 OpenRC 服务
msm service uninstall --manager openrc
```

## 验证安装

```bash
msm status
msm doctor
msm logs
```

浏览器访问：`http://<MSM-IP>:7777`

## 注意事项

- 如需为本机透明代理或 WireGuard 启用转发，请确保加载了 `tun` 模块并开启 `net.ipv4.ip_forward=1`。
- Alpine / OpenRC 环境不会通过 `systemctl` 自动调整宿主机 `53` 端口占用，若 `ss -lntup | grep ':53 '` 显示已有服务监听，请先确认并手动释放后再启用 MosDNS。
- 按实际防火墙策略放行 `7777`、DNS 与代理端口。

## 下一步

- [首次使用](/zh/guide/first-use)
- [路由器接入总览](/zh/guide/router-integration)
- [CLI 命令参考](/zh/guide/cli)
