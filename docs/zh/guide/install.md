# 安装部署

MSM 是单一二进制程序，零外部依赖，安装非常简单。

## 系统要求

### 支持的平台

- ✅ **Linux** (Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / Alpine 3.15+)
- ✅ **macOS** (10.15+)

### 支持的架构

- ✅ x86_64 (amd64)
- ✅ ARM64 (aarch64)

### 支持的 libc

- ✅ **glibc** (标准 Linux 发行版)
- ✅ **musl** (Alpine Linux)

### 最低配置

- **CPU**: 1 核心
- **内存**: 512MB
- **磁盘**: 2GB 可用空间
- **权限**: root 或 sudo 权限（Linux）/ 管理员权限（macOS）

### 推荐配置

- **CPU**: 2 核心以上
- **内存**: 2GB 以上
- **磁盘**: 10GB 以上可用空间
- **网络**: 公网 IP（用于远程访问）

## 快速安装

### 方式一:一键脚本(推荐)

::: tip root 用户提示
如果你已经是 root 用户,可以省略 `sudo`,直接运行:
```bash
# 使用 curl
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash
```
:::

```bash
# 使用 curl 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
```

::: tip 国内加速镜像
如果 GitHub 访问速度较慢，可以使用以下加速镜像：

**推荐镜像**（全球加速，国内优选）：
```bash
# 普通用户
curl -fsSL https://edgeone.gh-proxy.org/https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# root 用户
curl -fsSL https://edgeone.gh-proxy.org/https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash
```

**其他可选镜像**：
```bash
# Fastly CDN (普通用户)
curl -fsSL https://hk.gh-proxy.org/https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# 全球加速（带数据统计）(普通用户)
curl -fsSL https://cdn.gh-proxy.org/https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# 国内线路优化（不建议大文件下载）(普通用户)
curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# 备用镜像 (普通用户)
curl -fsSL https://gh-proxy.org/https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
```

**IPv6 用户**：
```bash
# 普通用户
curl -fsSL https://v6.gh-proxy.org/https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# root 用户
curl -fsSL https://v6.gh-proxy.org/https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | bash
```

**安装脚本下载失败时的处理**：
```bash
# 使用代理转发 GitHub API/Release 下载（普通用户示例）
MSM_GITHUB_PROXY=https://cdn.gh-proxy.org curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash

# 若 curl 连接失败，可改用 wget
MSM_GITHUB_PROXY=https://cdn.gh-proxy.org wget -qO- https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
```
:::

脚本会自动：
- 检测系统架构和 libc 类型
- 下载对应版本（glibc 或 musl）
- 安装到 `/usr/local/bin/msm`
- 安装系统服务并设置开机自启（systemd）

::: tip Alpine Linux 支持
脚本会自动检测 Alpine Linux 并下载 musl 版本。由于 Alpine 使用 OpenRC 而非 systemd，需要手动启动 MSM：
```bash
msm -d  # 后台运行
```
:::

### 方式二：手动安装

#### 1. 下载二进制文件

访问 [Releases 页面](https://github.com/msm9527/msm-wiki/releases/latest) 下载对应平台和架构的压缩包。

**Linux amd64 (glibc)**:
```bash
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.1-linux-amd64.tar.gz
tar -xzf msm-0.7.1-linux-amd64.tar.gz
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm
```

**Linux amd64 (musl - Alpine)**:
```bash
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.1-linux-amd64-musl.tar.gz
tar -xzf msm-0.7.1-linux-amd64-musl.tar.gz
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm
```

**Linux arm64 (glibc)**:
```bash
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.1-linux-arm64.tar.gz
tar -xzf msm-0.7.1-linux-arm64.tar.gz
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm
```

**Linux arm64 (musl - Alpine)**:
```bash
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.1-linux-arm64-musl.tar.gz
tar -xzf msm-0.7.1-linux-arm64-musl.tar.gz
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm
```

**macOS amd64 (Intel)**:
```bash
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.1-darwin-amd64.tar.gz
tar -xzf msm-0.7.1-darwin-amd64.tar.gz
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm
```

**macOS arm64 (Apple Silicon)**:
```bash
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.1-darwin-arm64.tar.gz
tar -xzf msm-0.7.1-darwin-arm64.tar.gz
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm
```

::: tip 提示
请将版本号 `0.7.1` 替换为最新版本号。
:::

#### 2. 安装系统服务

```bash
# 安装系统服务并设置开机自启
sudo msm service install

# 启动服务
sudo systemctl start msm

# 查看状态
sudo systemctl status msm
```

## MSM 命令详解

### 默认行为

```bash
# 不加任何参数时，自动执行 serve 命令启动 HTTP 服务
msm
```

### 基本命令

```bash
# 启动 HTTP 服务（前台运行）
msm serve

# 指定端口启动
msm -p 8080

# 指定配置目录
msm -c /opt/msm

# 后台运行
msm -d

# 查看版本
msm -v

# 查看帮助
msm -h
```

### 服务管理命令

```bash
# 安装系统服务（开机自启）
sudo msm service install

# 卸载系统服务
sudo msm service uninstall

# 停止 MSM 服务
sudo msm stop

# 重启 MSM 服务
sudo msm restart

# 查看服务状态
sudo msm status
```

### 系统管理命令

```bash
# 初始化配置目录
msm init

# 重置管理员密码
sudo msm reset-password

# 系统诊断
sudo msm doctor

# 查看服务日志
sudo msm logs
```

### 使用 systemd 管理（推荐）

安装系统服务后，推荐使用 systemd 命令管理：

```bash
# 启动服务
sudo systemctl start msm

# 停止服务
sudo systemctl stop msm

# 重启服务
sudo systemctl restart msm

# 查看状态
sudo systemctl status msm

# 查看日志
sudo journalctl -u msm -f

# 查看最近 50 条日志
sudo journalctl -u msm -n 50

# 禁用开机自启
sudo systemctl disable msm

# 启用开机自启
sudo systemctl enable msm
```

## 配置说明

### 默认配置

- **配置目录**: `/root/.msm`
- **HTTP 端口**: `7777`
- **数据目录**: `/root/.msm/data`
- **日志目录**: `/root/.msm/logs`

### 自定义配置

```bash
# 使用自定义配置目录
msm -c /opt/msm

# 使用自定义端口
msm -p 8080

# 组合使用
msm -c /opt/msm -p 8080 -d
```

## 首次使用

### 1. 访问 Web 界面

打开浏览器访问：

```
http://your-server-ip:7777
```

### 2. 创建管理员账号

::: tip 首次访问
首次访问时，系统会引导你创建管理员账号。请设置强密码并妥善保管。
:::

### 3. 开始使用

登录后即可开始管理 MosDNS、SingBox 和 Mihomo 服务。

## 更新 MSM

### 方式一：手动更新

```bash
# 停止服务
sudo systemctl stop msm

# 备份当前版本
sudo cp /usr/local/bin/msm /usr/local/bin/msm.backup

# 下载最新版本（以 0.7.1 为例，请替换为实际版本号）
wget https://github.com/msm9527/msm-wiki/releases/latest/download/msm-0.7.1-linux-amd64.tar.gz
tar -xzf msm-0.7.1-linux-amd64.tar.gz

# 替换文件
sudo mv msm /usr/local/bin/msm
sudo chmod +x /usr/local/bin/msm

# 启动服务
sudo systemctl start msm

# 查看状态
sudo systemctl status msm
```

### 方式二：重新运行安装脚本

```bash
# 安装脚本会自动检测并更新
curl -fsSL https://raw.githubusercontent.com/msm9527/msm-wiki/main/install.sh | sudo bash
```

## 卸载 MSM

### 使用 MSM 命令卸载

```bash
# 卸载系统服务
sudo msm service uninstall

# 删除二进制文件
sudo rm /usr/local/bin/msm

# 删除配置目录（可选，会删除所有数据）
sudo rm -rf /root/.msm
```

### 手动卸载

```bash
# 停止并禁用服务
sudo systemctl stop msm
sudo systemctl disable msm

# 删除 systemd 服务文件
sudo rm /etc/systemd/system/msm.service
sudo systemctl daemon-reload

# 删除二进制文件
sudo rm /usr/local/bin/msm

# 删除配置目录（可选，会删除所有数据）
sudo rm -rf /root/.msm
```

## 故障排查

### 服务无法启动

**查看详细日志**:

```bash
# 使用 MSM 命令查看日志
sudo msm logs

# 使用 systemd 查看日志
sudo journalctl -u msm -n 50 --no-pager

# 使用 doctor 命令诊断
sudo msm doctor
```

### 无法访问 Web 界面

**检查服务状态**:

```bash
# 查看服务状态
sudo msm status

# 或使用 systemd
sudo systemctl status msm
```

**检查端口监听**:

```bash
sudo netstat -tlnp | grep 7777
# 或
sudo ss -tlnp | grep 7777
```

### 重置管理员密码

```bash
sudo msm reset-password
```

## 安全建议

1. **修改默认密码**: 首次登录后立即修改
2. **使用强密码**: 密码长度至少 12 位，包含大小写字母、数字和特殊字符
3. **定期备份**: 定期备份配置目录 `/root/.msm`
4. **定期更新**: 及时更新到最新版本
5. **监控日志**: 定期检查日志文件

## 下一步

- [基础配置](/zh/guide/basic-config) - 配置系统参数
- [用户管理](/zh/guide/user-management) - 管理用户和权限
- [服务管理](/zh/guide/mosdns) - 开始管理服务

## 获取帮助

如果遇到问题：

- 查看 [常见问题](/zh/faq/)
- 查看 [故障排查](/zh/faq/troubleshooting)
- 提交 [Issue](https://github.com/msm9527/msm-wiki/issues)
- 参与 [讨论](https://github.com/msm9527/msm-wiki/discussions)
