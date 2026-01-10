# Docker 部署

MSM 支持 Docker 容器化部署，本文档介绍如何使用 Docker 部署 MSM。

::: warning 实验性功能
Docker 部署目前处于实验阶段，可能存在一些问题。生产环境建议使用传统部署方式。
:::

## 前置条件

### 1. 安装 Docker

**Ubuntu/Debian**:
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sudo bash

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
```

**CentOS/RHEL**:
```bash
# 安装 Docker
sudo yum install -y docker

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
```

### 2. 安装 Docker Compose（可选）

```bash
# 下载 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

## 方式一：使用 Docker 命令

### 1. 拉取镜像

```bash
# 拉取最新版本
docker pull msm9527/msm:latest

# 或拉取指定版本
docker pull msm9527/msm:0.7.1
```

### 2. 创建数据目录

```bash
# 创建数据目录
sudo mkdir -p /opt/msm/data
sudo mkdir -p /opt/msm/logs
sudo mkdir -p /opt/msm/config
```

### 3. 运行容器

```bash
docker run -d \
  --name msm \
  --restart unless-stopped \
  --network host \
  -v /opt/msm/data:/root/.msm/data \
  -v /opt/msm/logs:/root/.msm/logs \
  -v /opt/msm/config:/root/.msm/config \
  msm9527/msm:latest
```

::: tip 网络模式
使用 `--network host` 模式可以让容器直接使用主机网络，避免端口映射问题。这对于 DNS 服务（53 端口）和透明代理非常重要。
:::

### 4. 查看容器状态

```bash
# 查看容器状态
docker ps -a | grep msm

# 查看容器日志
docker logs -f msm

# 进入容器
docker exec -it msm bash
```

## 方式二：使用 Docker Compose

### 1. 创建 docker-compose.yml

```bash
mkdir -p /opt/msm
cd /opt/msm
```

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  msm:
    image: msm9527/msm:latest
    container_name: msm
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./data:/root/.msm/data
      - ./logs:/root/.msm/logs
      - ./config:/root/.msm/config
      - ./mosdns:/root/.msm/mosdns
      - ./singbox:/root/.msm/singbox
      - ./mihomo:/root/.msm/mihomo
    environment:
      - TZ=Asia/Shanghai
    cap_add:
      - NET_ADMIN
      - NET_RAW
    privileged: true
```

### 2. 启动服务

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|-------|------|--------|
| `TZ` | 时区 | `Asia/Shanghai` |
| `MSM_PORT` | Web 端口 | `7777` |
| `MSM_CONFIG_DIR` | 配置目录 | `/root/.msm` |

### 数据卷

| 容器路径 | 说明 | 建议挂载 |
|---------|------|---------|
| `/root/.msm/data` | 数据目录 | ✅ 必须 |
| `/root/.msm/logs` | 日志目录 | ✅ 推荐 |
| `/root/.msm/config` | 配置目录 | ✅ 推荐 |
| `/root/.msm/mosdns` | MosDNS 配置 | ✅ 推荐 |
| `/root/.msm/singbox` | SingBox 配置 | ✅ 推荐 |
| `/root/.msm/mihomo` | Mihomo 配置 | ✅ 推荐 |

### 网络模式

MSM 需要使用 `host` 网络模式，原因：

1. **DNS 服务**: MosDNS 需要监听 53 端口
2. **透明代理**: SingBox/Mihomo 需要使用 TProxy/Redirect
3. **避免 NAT**: 避免 Docker NAT 导致的网络问题

::: warning 注意
使用 `host` 网络模式时，容器将直接使用主机网络，无法使用端口映射。
:::

### 权限要求

MSM 需要以下权限：

- `NET_ADMIN`: 配置网络接口和路由
- `NET_RAW`: 使用原始套接字
- `privileged`: 特权模式（可选，用于某些高级功能）

## 更新容器

### 方式一：Docker 命令

```bash
# 停止并删除旧容器
docker stop msm
docker rm msm

# 拉取最新镜像
docker pull msm9527/msm:latest

# 重新运行容器（使用之前的命令）
docker run -d \
  --name msm \
  --restart unless-stopped \
  --network host \
  -v /opt/msm/data:/root/.msm/data \
  -v /opt/msm/logs:/root/.msm/logs \
  -v /opt/msm/config:/root/.msm/config \
  msm9527/msm:latest
```

### 方式二：Docker Compose

```bash
# 拉取最新镜像
docker-compose pull

# 重启服务
docker-compose up -d
```

## 故障排查

### 问题 1: 容器无法启动

**排查步骤**:
```bash
# 查看容器日志
docker logs msm

# 检查容器状态
docker ps -a | grep msm

# 检查端口占用
sudo ss -tlnp | grep 7777
```

### 问题 2: DNS 服务无法访问

**可能原因**:
- 53 端口被占用
- 防火墙阻止
- 网络模式不正确

**解决方法**:
```bash
# 检查 53 端口占用
sudo ss -tlnp | grep 53

# 停止占用 53 端口的服务（如 systemd-resolved）
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved

# 重启容器
docker restart msm
```

### 问题 3: 透明代理不工作

**可能原因**:
- 权限不足
- 网络模式不正确
- 路由配置错误

**解决方法**:
```bash
# 确认容器使用 host 网络模式
docker inspect msm | grep NetworkMode

# 确认容器有足够权限
docker inspect msm | grep -A 10 CapAdd

# 检查路由配置
ip route | grep 28.0.0.0
```

### 问题 4: 数据丢失

**原因**: 没有挂载数据卷

**解决方法**:
1. 停止容器
2. 重新运行容器，确保挂载数据卷
3. 从备份恢复数据

## 备份与恢复

### 备份

```bash
# 停止容器
docker-compose down

# 备份数据目录
tar -czf msm-backup-$(date +%Y%m%d).tar.gz /opt/msm

# 启动容器
docker-compose up -d
```

### 恢复

```bash
# 停止容器
docker-compose down

# 恢复数据
tar -xzf msm-backup-20260101.tar.gz -C /

# 启动容器
docker-compose up -d
```

## 性能优化

### 1. 限制资源使用

在 `docker-compose.yml` 中添加：

```yaml
services:
  msm:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### 2. 使用本地存储

避免使用网络存储（NFS、CIFS），使用本地存储提高性能。

### 3. 日志轮转

配置 Docker 日志轮转：

```yaml
services:
  msm:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 安全建议

1. **不要暴露端口**: 使用 `host` 网络模式时，确保防火墙配置正确
2. **定期更新**: 定期更新镜像到最新版本
3. **备份数据**: 定期备份数据目录
4. **限制权限**: 只授予必要的权限

## 下一步

- [完整使用流程](/zh/guide/complete-workflow) - 配置和使用 MSM
- [路由器集成](/zh/guide/router-integration) - 配置路由器
- [备份恢复](/zh/guide/backup-restore) - 备份和恢复配置
- [常见问题](/zh/faq/) - 故障排查
