# 备份恢复

本文档介绍如何备份和恢复 MSM 的配置和数据。

## 为什么需要备份

定期备份可以：

1. **防止数据丢失**: 硬件故障、误操作等导致的数据丢失
2. **快速恢复**: 系统故障时快速恢复到正常状态
3. **迁移部署**: 迁移到新服务器时快速部署
4. **版本回退**: 更新失败时回退到旧版本

## 备份内容

MSM 需要备份的内容包括：

| 内容 | 路径 | 重要性 | 说明 |
|------|------|--------|------|
| MSM 二进制文件 | `/usr/local/bin/msm` | 中 | 可重新下载 |
| MSM 数据库 | `/root/.msm/data/msm.db` | 高 | 用户、配置、历史记录 |
| MosDNS 配置 | `/root/.msm/mosdns/` | 高 | DNS 分流配置 |
| SingBox 配置 | `/root/.msm/singbox/` | 高 | 代理配置 |
| Mihomo 配置 | `/root/.msm/mihomo/` | 高 | 代理配置 |
| 日志文件 | `/root/.msm/logs/` | 低 | 可选备份 |

## 备份方式

### 方式一：完整备份（推荐）

备份整个 MSM 目录，包含所有配置和数据。

```bash
# 停止服务（可选，建议停止以确保数据一致性）
sudo systemctl stop msm

# 备份整个目录
sudo tar -czf /root/msm-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  /root/.msm \
  /usr/local/bin/msm

# 启动服务
sudo systemctl start msm

# 查看备份文件
ls -lh /root/msm-backup-*.tar.gz
```

### 方式二：增量备份

只备份配置文件，不备份日志和临时文件。

```bash
# 备份配置文件
sudo tar -czf /root/msm-config-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  /root/.msm/data/msm.db \
  /root/.msm/mosdns/config.yaml \
  /root/.msm/mosdns/client_ip.txt \
  /root/.msm/singbox/config.json \
  /root/.msm/mihomo/config.yaml \
  /usr/local/bin/msm
```

### 方式三：自动备份

使用 cron 定时任务自动备份。

#### 1. 创建备份脚本

```bash
# 创建备份脚本
sudo cat > /usr/local/bin/msm-backup.sh << 'EOF'
#!/bin/bash

# 配置
BACKUP_DIR="/root/msm-backups"
BACKUP_NAME="msm-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
KEEP_DAYS=7

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份
tar -czf $BACKUP_DIR/$BACKUP_NAME \
  /root/.msm \
  /usr/local/bin/msm

# 删除旧备份
find $BACKUP_DIR -name "msm-backup-*.tar.gz" -mtime +$KEEP_DAYS -delete

# 输出结果
echo "Backup completed: $BACKUP_DIR/$BACKUP_NAME"
ls -lh $BACKUP_DIR/$BACKUP_NAME
EOF

# 添加执行权限
sudo chmod +x /usr/local/bin/msm-backup.sh
```

#### 2. 配置 cron 定时任务

```bash
# 编辑 crontab
sudo crontab -e

# 添加以下行（每天凌晨 2 点备份）
0 2 * * * /usr/local/bin/msm-backup.sh >> /var/log/msm-backup.log 2>&1
```

### 方式四：远程备份

将备份文件上传到远程服务器或云存储。

#### 上传到远程服务器（rsync）

```bash
# 备份并上传
sudo tar -czf /tmp/msm-backup-$(date +%Y%m%d).tar.gz /root/.msm /usr/local/bin/msm
rsync -avz /tmp/msm-backup-$(date +%Y%m%d).tar.gz user@remote-server:/backups/
rm /tmp/msm-backup-$(date +%Y%m%d).tar.gz
```

#### 上传到云存储（rclone）

```bash
# 安装 rclone
curl https://rclone.org/install.sh | sudo bash

# 配置 rclone（按提示配置云存储）
rclone config

# 备份并上传
sudo tar -czf /tmp/msm-backup-$(date +%Y%m%d).tar.gz /root/.msm /usr/local/bin/msm
rclone copy /tmp/msm-backup-$(date +%Y%m%d).tar.gz remote:msm-backups/
rm /tmp/msm-backup-$(date +%Y%m%d).tar.gz
```

## 恢复数据

### 方式一：完整恢复

从完整备份恢复所有数据。

```bash
# 停止服务
sudo systemctl stop msm

# 备份当前数据（以防恢复失败）
sudo mv /root/.msm /root/.msm.old
sudo mv /usr/local/bin/msm /usr/local/bin/msm.old

# 恢复备份
sudo tar -xzf /root/msm-backup-20260101-120000.tar.gz -C /

# 启动服务
sudo systemctl start msm

# 验证恢复
sudo systemctl status msm
msm -v
```

### 方式二：部分恢复

只恢复特定的配置文件。

#### 恢复 MosDNS 配置

```bash
# 停止服务
sudo systemctl stop msm

# 备份当前配置
sudo cp /root/.msm/mosdns/config.yaml /root/.msm/mosdns/config.yaml.old

# 从备份中提取配置
sudo tar -xzf /root/msm-backup-20260101-120000.tar.gz \
  -C / \
  root/.msm/mosdns/config.yaml

# 启动服务
sudo systemctl start msm
```

#### 恢复 SingBox 配置

```bash
# 停止服务
sudo systemctl stop msm

# 备份当前配置
sudo cp /root/.msm/singbox/config.json /root/.msm/singbox/config.json.old

# 从备份中提取配置
sudo tar -xzf /root/msm-backup-20260101-120000.tar.gz \
  -C / \
  root/.msm/singbox/config.json

# 启动服务
sudo systemctl start msm
```

#### 恢复数据库

```bash
# 停止服务
sudo systemctl stop msm

# 备份当前数据库
sudo cp /root/.msm/data/msm.db /root/.msm/data/msm.db.old

# 从备份中提取数据库
sudo tar -xzf /root/msm-backup-20260101-120000.tar.gz \
  -C / \
  root/.msm/data/msm.db

# 启动服务
sudo systemctl start msm
```

### 方式三：迁移到新服务器

将 MSM 迁移到新服务器。

#### 1. 在旧服务器上备份

```bash
# 停止服务
sudo systemctl stop msm

# 备份
sudo tar -czf /tmp/msm-migration.tar.gz \
  /root/.msm \
  /usr/local/bin/msm

# 传输到新服务器
scp /tmp/msm-migration.tar.gz user@new-server:/tmp/
```

#### 2. 在新服务器上恢复

```bash
# 解压备份
sudo tar -xzf /tmp/msm-migration.tar.gz -C /

# 安装 systemd 服务
sudo msm service install

# 启动服务
sudo systemctl start msm
sudo systemctl enable msm

# 验证
sudo systemctl status msm
```

## 验证备份

定期验证备份文件的完整性。

### 1. 检查备份文件

```bash
# 查看备份文件大小
ls -lh /root/msm-backup-*.tar.gz

# 检查备份文件完整性
tar -tzf /root/msm-backup-20260101-120000.tar.gz > /dev/null
echo $?  # 应该输出 0
```

### 2. 测试恢复

在测试环境中测试恢复流程。

```bash
# 创建测试目录
mkdir -p /tmp/msm-restore-test

# 解压备份到测试目录
tar -xzf /root/msm-backup-20240101-120000.tar.gz -C /tmp/msm-restore-test

# 检查文件
ls -la /tmp/msm-restore-test/root/.msm/
ls -la /tmp/msm-restore-test/usr/local/bin/

# 清理测试目录
rm -rf /tmp/msm-restore-test
```

## 备份策略建议

### 1. 3-2-1 备份策略

- **3 份副本**: 原始数据 + 2 份备份
- **2 种介质**: 本地硬盘 + 远程服务器/云存储
- **1 份异地**: 至少 1 份备份存储在异地

### 2. 备份频率

| 数据类型 | 备份频率 | 保留时间 |
|---------|---------|---------|
| 完整备份 | 每周 | 4 周 |
| 增量备份 | 每天 | 7 天 |
| 配置变更 | 实时 | 30 天 |

### 3. 备份保留策略

```bash
# 保留最近 7 天的每日备份
find /root/msm-backups -name "msm-backup-*.tar.gz" -mtime +7 -delete

# 保留最近 4 周的每周备份
# （需要手动标记周备份）

# 保留最近 12 个月的每月备份
# （需要手动标记月备份）
```

## 自动化备份脚本

完整的自动化备份脚本示例：

```bash
#!/bin/bash

# 配置
BACKUP_DIR="/root/msm-backups"
REMOTE_BACKUP="user@remote-server:/backups/msm/"
KEEP_DAYS=7
LOG_FILE="/var/log/msm-backup.log"

# 函数：记录日志
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# 函数：发送通知（可选）
notify() {
    # 发送邮件或其他通知
    echo "$1" | mail -s "MSM Backup Notification" admin@example.com
}

# 开始备份
log "Starting MSM backup..."

# 创建备份目录
mkdir -p $BACKUP_DIR

# 生成备份文件名
BACKUP_NAME="msm-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# 停止服务（可选）
# systemctl stop msm

# 执行备份
if tar -czf $BACKUP_PATH /root/.msm /usr/local/bin/msm 2>>$LOG_FILE; then
    log "Backup completed: $BACKUP_PATH"
    BACKUP_SIZE=$(du -h $BACKUP_PATH | cut -f1)
    log "Backup size: $BACKUP_SIZE"
else
    log "ERROR: Backup failed!"
    notify "MSM backup failed!"
    exit 1
fi

# 启动服务（如果之前停止了）
# systemctl start msm

# 上传到远程服务器（可选）
if [ -n "$REMOTE_BACKUP" ]; then
    log "Uploading backup to remote server..."
    if rsync -avz $BACKUP_PATH $REMOTE_BACKUP 2>>$LOG_FILE; then
        log "Remote backup completed"
    else
        log "WARNING: Remote backup failed!"
        notify "MSM remote backup failed!"
    fi
fi

# 删除旧备份
log "Cleaning old backups..."
DELETED=$(find $BACKUP_DIR -name "msm-backup-*.tar.gz" -mtime +$KEEP_DAYS -delete -print | wc -l)
log "Deleted $DELETED old backup(s)"

# 完成
log "Backup process completed successfully"
```

## 常见问题

### 问题 1: 备份文件太大

**解决方法**:
1. 排除日志文件：
   ```bash
   tar -czf backup.tar.gz --exclude='/root/.msm/logs' /root/.msm
   ```
2. 使用增量备份
3. 压缩级别调整：
   ```bash
   tar -czf backup.tar.gz --use-compress-program="gzip -9" /root/.msm
   ```

### 问题 2: 恢复后服务无法启动

**排查步骤**:
1. 检查文件权限：
   ```bash
   sudo chown -R root:root /root/.msm
   sudo chmod +x /usr/local/bin/msm
   ```
2. 检查配置文件：
   ```bash
   sudo msm doctor
   ```
3. 查看日志：
   ```bash
   sudo journalctl -u msm -n 100
   ```

### 问题 3: 备份失败

**可能原因**:
- 磁盘空间不足
- 权限不足
- 文件被占用

**解决方法**:
1. 检查磁盘空间：`df -h`
2. 使用 root 权限：`sudo`
3. 停止服务后再备份

## 下一步

- [更新升级](/zh/guide/update) - 更新 MSM 和组件
- [Docker 部署](/zh/guide/docker) - Docker 环境的备份
- [故障排查](/zh/faq/troubleshooting) - 解决备份问题
- [常见问题](/zh/faq/) - 更多问题解答
