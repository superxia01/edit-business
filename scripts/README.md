# 部署脚本使用说明

## 概述

本项目的部署脚本遵循 KeenChase V4.0 统一部署规范，实现了自动化部署流程。

## 目录结构

```
scripts/
├── deploy-production.sh      # 生产环境部署脚本
├── first-deploy.sh           # 首次部署脚本
└── ops/                      # 运维配置目录（不在 Git 中）
    ├── config.sh             # 实际配置文件（需手动创建）
    ├── config.example.sh     # 配置示例
    ├── systemd.template.service  # systemd 服务模板
    └── nginx.template.conf   # Nginx 配置模板
```

## 首次部署

### 1. 创建配置文件

```bash
# 复制配置示例
cp scripts/ops/config.example.sh scripts/ops/config.sh

# 编辑配置文件
nano scripts/ops/config.sh
```

### 2. 执行首次部署

```bash
# 添加可执行权限
chmod +x scripts/first-deploy.sh

# 执行首次部署
./scripts/first-deploy.sh
```

首次部署脚本会自动完成：
- 创建部署目录
- 配置 systemd 服务
- 配置 Nginx
- 提示创建环境变量
- 提示执行数据库迁移

### 3. 创建环境变量

登录服务器创建环境变量文件：

```bash
ssh shanghai-tencent
sudo nano /var/www/edit-business/.env
```

粘贴以下内容（修改密码等敏感信息）：

```bash
APP_ENV=production
APP_PORT=8084

DB_HOST=localhost
DB_PORT=5432
DB_USER=nexus_user
DB_PASSWORD=hRJ9NSJApfeyFDraaDgkYowY
DB_NAME=edit_business_db
DB_SSLMODE=disable

AUTH_CENTER_URL=https://os.crazyaigc.com
AUTH_CENTER_CALLBACK_URL=https://edit.crazyaigc.com/api/v1/auth/callback

JWT_SECRET=change-this-secret-in-production-min-32-chars
JWT_ACCESS_TOKEN_EXPIRE=24h

LOG_LEVEL=info
LOG_FORMAT=json
```

设置权限：

```bash
sudo chmod 600 /var/www/edit-business/.env
sudo chown ubuntu:ubuntu /var/www/edit-business/.env
```

### 4. 执行数据库迁移

```bash
# 创建数据库（如果不存在）
ssh hangzhou-ali "sudo -u postgres psql -c \"CREATE DATABASE edit_business_db;\""

# 执行迁移
ssh shanghai-tencent "psql -h localhost -U nexus_user -d edit_business_db -f /var/www/edit-business/migrations/001_init_schema.up.sql"
```

### 5. 部署应用

```bash
./scripts/deploy-production.sh
```

## 日常部署

### 更新部署

```bash
# 添加可执行权限（首次）
chmod +x scripts/deploy-production.sh

# 执行部署
./scripts/deploy-production.sh
```

部署脚本会自动完成：
- 前端构建和上传
- 后端交叉编译和上传
- 服务重启
- 健康检查

### 回滚部署

如果新版本有问题，可以快速回滚：

```bash
# 登录服务器
ssh shanghai-tencent

# 查看备份文件
ls -la /var/www/edit-business/*.backup.*

# 回滚到指定版本（注意：现在使用 edit-api）
sudo mv /var/www/edit-business/edit-api.backup.20260205_120000 /var/www/edit-business/edit-api

# 重启服务
sudo systemctl restart edit-business
```

## 运维管理

### 查看服务状态

```bash
# 查看服务状态
ssh shanghai-tencent "sudo systemctl status edit-business"

# 查看日志
ssh shanghai-tencent "sudo journalctl -u edit-business -f"

# 查看 Nginx 状态
ssh shanghai-tencent "sudo systemctl status nginx"
```

### 修改环境变量

```bash
# 登录服务器
ssh shanghai-tencent

# 编辑环境变量
sudo nano /var/www/edit-business/.env

# 重启服务
sudo systemctl restart edit-business

# 备份旧配置
cp /var/www/edit-business/.env /var/www/edit-business/.env.backup.$(date +%Y%m%d)
```

### 数据库迁移

```bash
# 执行新迁移
ssh shanghai-tencent "psql -h localhost -U nexus_user -d edit_business_db -f /var/www/edit-business/migrations/002_new_migration.up.sql"

# 回滚迁移
ssh shanghai-tencent "psql -h localhost -U nexus_user -d edit_business_db -f /var/www/edit-business/migrations/002_new_migration.down.sql"
```

## 故障排查

### 服务启动失败

```bash
# 查看详细日志
ssh shanghai-tencent "sudo journalctl -u edit-business -n 50 --no-pager"

# 检查环境变量
ssh shanghai-tencent "sudo cat /var/www/edit-business/.env"

# 手动启动测试
ssh shanghai-tencent "cd /var/www/edit-business && ./edit-api"
```

### 前端访问 404

```bash
# 检查前端文件
ssh shanghai-tencent "ls -la /var/www/edit-business-frontend/"

# 检查 Nginx 配置
ssh shanghai-tencent "sudo nginx -t"

# 查看 Nginx 日志
ssh shanghai-tencent "sudo tail -f /var/log/nginx/error.log"
```

### 数据库连接失败

```bash
# 检查 SSH 隧道
ssh shanghai-tencent "sudo systemctl status pg-tunnel"

# 测试数据库连接
ssh shanghai-tencent "psql -h localhost -U nexus_user -d edit_business_db -c 'SELECT 1;'"

# 查看后端日志
ssh shanghai-tencent "sudo journalctl -u edit-business -f | grep -i database"
```

## 安全注意事项

1. **配置文件不在 Git 中**
   - `scripts/ops/config.sh` 包含敏感信息，不应提交
   - 已添加到 `.gitignore`

2. **环境变量管理**
   - 服务器上的 `.env` 文件权限为 600
   - 修改环境变量需登录服务器手动操作

3. **SSH 密钥管理**
   - 使用 `~/.ssh/config` 配置的别名
   - 密钥文件权限为 600

4. **定期备份**
   - 部署脚本自动备份二进制文件
   - 环境变量变更时建议手动备份
