# Alpine 安装

Alpine 使用 musl 与 OpenRC，安装流程与常规 Linux 略有不同。

## 依赖准备

确保已安装 Bash 以及 `curl` 或 `wget`。Alpine 默认通常没有 Bash：

```bash
apk add --no-cache bash curl
```

## 一键安装

```bash
# sudo
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
# root 用户
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash
```

## 国内网络加速（可选）

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

脚本会自动选择 **musl** 版本。Alpine 使用 OpenRC，可用内置命令托管启动。

## 启动方式（OpenRC）

```bash
# sudo
sudo msm service install --manager openrc
rc-service msm start
# root 用户
msm service install --manager openrc
rc-service msm start
```

## 验证安装

```bash
msm status
msm logs
```

浏览器访问：`http://<MSM-IP>:7777`

## 注意事项

- 如需开机自启，请使用 OpenRC 自行创建服务脚本
- Alpine / OpenRC 环境不支持脚本通过 `systemctl` 自动处理 53 端口冲突，如有占用请先手动释放
- 端口开放请按实际防火墙策略配置

## 下一步

- [路由器集成](/zh/guide/router-integration)
- [首次使用](/zh/guide/first-use)
