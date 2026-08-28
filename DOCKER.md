# MSM Docker 镜像

MSM 官方镜像支持 `linux/amd64`、`linux/arm64`、`linux/arm/v7`、`linux/arm/v6` 和 `linux/386`。

完整部署、网络模式、权限、端口和排错说明见 [Docker 安装文档](https://doc.msmbox.net/zh/guide/docker)。

## 推荐：Docker Compose

仓库提供的 `docker-compose.yml` 默认使用 Bridge 网络和显式端口映射。先在 `.env` 固定镜像版本并设置随机 JWT 密钥：

```dotenv
MSM_IMAGE=msmbox/msm:1.3.0
JWT_SECRET=替换为至少32个随机字符
MSM_DATA_DIR=./data
MSM_WEB_PORT=7777
```

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=100 msm
```

访问 `http://<宿主机地址>:7777`。

## Docker Run

```bash
docker run -d \
  --name msm \
  --restart unless-stopped \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --device /dev/net/tun:/dev/net/tun \
  --sysctl net.ipv4.ip_forward=1 \
  --sysctl net.ipv6.conf.all.forwarding=1 \
  --sysctl net.ipv6.conf.all.accept_ra=2 \
  -p 7777:7777 \
  -p 53:53/udp \
  -p 1053:1053/udp \
  -p 7890:7890 \
  -p 7891:7891 \
  -p 7892:7892 \
  -e JWT_SECRET='替换为至少32个随机字符' \
  -e MSM_CONFIG_DIR=/opt/msm \
  -e TZ=Asia/Shanghai \
  -v /opt/msm:/opt/msm \
  msmbox/msm:1.3.0
```

`NET_ADMIN`、`NET_RAW` 和 `/dev/net/tun` 用于 TUN、透明代理、诊断与受管隧道。默认不需要 `--privileged`。

## 网络模式

- **Bridge（默认）**：使用 `-p` / `ports:` 只发布需要的端口；容器中的 `127.0.0.1` 指向容器自身。
- **Host（Linux 可选）**：删除所有端口映射，设置 `network_mode: host` 和 `MSM_NETWORK_SCOPE=host`；只在确实需要直接使用宿主网络时启用。

Edge 反向代理和远程回家使用自定义监听端口时，还要为对应 TCP / UDP 端口添加映射。映射端口不会让 MSM 自动监听，只有启用相应配置后才会创建监听器。

## 数据与安全

- 必须持久化 `/opt/msm`。
- `JWT_SECRET` 至少 32 个随机字符，不要提交到仓库。
- 只暴露实际需要的端口，并用防火墙限制管理入口。
- 不把 DNS 凭据、Cloudflare Token、证书私钥和订阅写进镜像层。

## 更新

Docker 部署不在容器内更新 MSM 主二进制。修改镜像版本并重建：

```bash
docker compose pull
docker compose up -d
docker compose logs --tail=100 msm
```

## 版本标签

- `latest`：最新稳定版
- `beta-latest`：最新测试版
- `x.y.z`：指定正式版本

生产环境推荐使用明确版本或镜像摘要。

## 资源

- [项目主页](https://github.com/msm9527/msm)
- [完整文档](https://doc.msmbox.net/zh/guide/docker)
- [Docker Hub](https://hub.docker.com/r/msmbox/msm)
- [问题反馈](https://github.com/msm9527/msm/issues)
