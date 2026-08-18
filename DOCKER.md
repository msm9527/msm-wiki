# MSM Docker 镜像

MSM 官方 Docker 镜像，支持多架构部署。

## 支持的架构

- `linux/amd64` - x86_64 系统
- `linux/arm64` - ARM64 系统（如树莓派 4、Apple Silicon）
- `linux/arm/v7` - ARMv7 系统（如树莓派 3）
- `linux/arm/v6` - ARMv6 系统（如树莓派 Zero）
- `linux/386` - 32位 x86 系统

## 快速开始

> ⚠️ 目前 Docker 部署仅支持 **Host 网络模式**（`--network host` / `network_mode: host`），不支持其他网络模式（包括 `bridge` / `macvlan` / `ipvlan` 等，以及 `-p` / `ports:` 端口映射）。

### 基础运行

```bash
docker run -d \
  --name msm \
  --network host \
  -v msm-data:/opt/msm \
  --restart unless-stopped \
  msmbox/msm:latest
```

访问 `http://localhost:7777` 开始使用。

### 完整配置

```bash
docker run -d \
  --name msm \
  --network host \
  -v msm-data:/opt/msm \
  -v msm-logs:/var/log/msm \
  -e TZ=Asia/Shanghai \
  -e MSM_PORT=7777 \
  --restart unless-stopped \
  msmbox/msm:latest
```

## 端口说明

| 端口 | 协议 | 说明 |
|------|------|------|
| 7777 | TCP | Web 管理界面 |
| 53 | UDP/TCP | DNS 服务 (MosDNS) |
| 1053 | UDP/TCP | DNS 备用端口 |
| 7890 | TCP | HTTP 代理 (SingBox/Clash) |
| 7891 | TCP | SOCKS5 代理 (SingBox/Clash) |
| 7892 | TCP | 混合代理端口 (SingBox/Clash) |
| 6666 | TCP | 管理端口 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MSM_PORT` | `7777` | Web 管理界面端口 |
| `MSM_CONFIG_DIR` | `/opt/msm` | 配置目录路径 |
| `TZ` | `Asia/Shanghai` | 时区设置 |
| `JWT_SECRET` | - | JWT 密钥（可选） |

## Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  msm:
    image: msmbox/msm:latest
    container_name: msm
    restart: unless-stopped
    network_mode: host
    volumes:
      - msm-data:/opt/msm
      - msm-logs:/var/log/msm
    environment:
      - TZ=Asia/Shanghai
      - MSM_PORT=7777
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7777/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s

volumes:
  msm-data:
  msm-logs:
```

启动：

```bash
docker-compose up -d
```

## 数据持久化

建议挂载以下目录：

- `/opt/msm` - 配置文件和数据目录
- `/var/log/msm` - 日志目录（可选）

## 网络模式

目前仅支持 Host 网络模式，不支持其他网络模式（包括 `bridge` / `macvlan` / `ipvlan` 等，以及端口映射 `-p` / `ports:`）。

### Host 网络模式（必选）

适合需要直接访问宿主机网络的场景（如 DNS 服务）：

```bash
docker run -d \
  --name msm \
  --network host \
  -v msm-data:/opt/msm \
  msmbox/msm:latest
```

**注意**：Host 模式下不需要 `-p` 参数，服务直接使用宿主机端口。

## 常见问题

### 1. 53 端口被占用

如果宿主机的 53 端口被占用（如 systemd-resolved），可以：

Host 模式下无法通过 `-p` 进行端口重映射，请先释放宿主机 53 端口（例如停止 systemd-resolved）：

```bash
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved
```

### 2. 权限问题

容器内使用非 root 用户（uid=1000）运行，如果遇到权限问题：

```bash
# 修改挂载目录权限
sudo chown -R 1000:1000 /path/to/msm-data
```

### 3. 查看日志

```bash
# 查看容器日志
docker logs -f msm

# 查看 MSM 应用日志
docker exec msm ls -lh /var/log/msm
```

### 4. 进入容器

```bash
docker exec -it msm bash
```

## 更新镜像

```bash
# 停止并删除旧容器
docker stop msm
docker rm msm

# 拉取最新镜像
docker pull msmbox/msm:latest

# 重新创建容器
docker run -d \
  --name msm \
  --network host \
  -v msm-data:/opt/msm \
  msmbox/msm:latest
```

使用 Docker Compose：

```bash
docker-compose pull
docker-compose up -d
```

## RouterOS Container

1.为容器添加veth接口，为其分配一个内网专用 IP
```bash
/interface veth
add address=192.168.88.2/24,fd88::2/64 dhcp=no gateway=192.168.88.1 gateway6=fd88::1 name=veth-msm
```

2.将veth 添加到网桥
```bash
/interface bridge port
add bridge=bridge1 interface=veth-msm
```

3.设置“Docker注册表 URL”，并为镜像设置目录
```bash
/container config
set registry-url=https://registry-1.docker.io tmpdir=/pull
```

4.定义配置文件的挂载点
```bash
/file
add name=msm type=directory

/container mounts
add list=msm_data dst=/opt/msm src=/msm
```

5.创建环境变量
```bash
/container envs
add list=msm_envs key=JWT_SECRET value=""
add list=msm_envs key=MSM_CONFIG_DIR value=/opt/msm
add list=msm_envs key=MSM_PORT value=7777
add list=msm_envs key=PATH value=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
add list=msm_envs key=TZ value=Asia/Shanghai
```

6.拉取 MSM 镜像并等待其提取，创建容器完成
```bash
/container
add name=msm remote-image=msmbox/msm:latest interface=veth-msm envlists=msm_envs layer-dir="" cmd="sh -c 'msm serve -p 7777 -c /opt/msm'" logging=yes mountlists=msm_data root-dir=msm shm-size=unlimited workdir=/opt/msm start-on-boot=yes
```

7.启动容器
```bash
/container/start 0
```

## 版本标签

- `latest` - 最新稳定版本
- `x.y.z` - 特定版本号（如 `0.7.1`）

## 资源

- [项目主页](https://github.com/msm9527/msm)
- [完整文档](https://doc.msmbox.net/)
- [Docker Hub](https://hub.docker.com/r/msmbox/msm)
- [问题反馈](https://github.com/msm9527/msm/issues)

## 许可证
