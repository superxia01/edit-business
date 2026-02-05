# Edit Business 部署检查清单

**用途**: 部署前快速核对（30秒）
**目标**: 避免常见的目录错误、命名错误、配置错误

---

## ✅ 部署前必查项（5步）

### 1️⃣ 确认系统信息

**系统配置**：
```bash
系统名称: edit-business
仓库: superxia01/edit-business
本地路径: /Users/xia/Documents/GitHub/edit-business
域名: edit.crazyaigc.com
```

**检查命令**：
```bash
# 查看配置文件
cat scripts/ops/config.sh

# 验证配置
grep "SYSTEM_NAME\|BINARY_NAME\|DOMAIN" scripts/ops/config.sh
```

**预期输出**：
```
SYSTEM_NAME="edit-business"
BINARY_NAME="edit-api"
DOMAIN="edit.crazyaigc.com"
```

---

### 2️⃣ 确认二进制文件名

**标准**: `edit-api` (符合 `{system-name}-api` 格式)

**❌ 常见错误**：
- 文件名与系统不匹配（如 `edit-business`）
- 构建后忘记重命名

**检查命令**：
```bash
# 本地检查二进制文件名
ls -lh backend/edit-api

# 确认文件存在且大小合理（应该是 20-30MB）
file backend/edit-api
# 输出：ELF 64-bit LSB executable, x86-64, ...
```

---

### 3️⃣ 确认目录结构

**服务器目录**：
```bash
后端目录: /var/www/edit-business
前端目录: /var/www/edit-business-frontend
```

**检查命令**：
```bash
# 上传前确认目标目录存在
ssh shanghai-tencent "ls -la /var/www/edit-business"
ssh shanghai-tencent "ls -la /var/www/edit-business-frontend"

# 确认 systemd 配置中的路径
ssh shanghai-tencent "sudo systemctl cat edit-business | grep WorkingDirectory"
ssh shanghai-tencent "sudo systemctl cat edit-business | grep ExecStart"
```

**预期输出**：
```
WorkingDirectory=/var/www/edit-business
ExecStart=/var/www/edit-business/edit-api
```

---

### 4️⃣ 确认环境变量

**⚠️ 核心原则：部署不覆盖 .env 文件！**

**标准数据库配置**：
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=nexus_user
DB_PASSWORD=hRJ9NSJApfeyFDraaDgkYowY
DB_NAME=edit_business_db
DB_SSLMODE=disable
```

**检查命令**：
```bash
# 确认服务器的 .env 文件存在且未被修改
ssh shanghai-tencent "cat /var/www/edit-business/.env | head -10"

# 检查文件权限（应该是 600）
ssh shanghai-tencent "ls -la /var/www/edit-business/.env"
```

---

### 5️⃣ 确认 systemd 服务名

**服务名**: `edit-business`

**检查命令**：
```bash
# 确认服务存在
ssh shanghai-tencent "sudo systemctl status edit-business"

# 查看 ExecStart 路径
ssh shanghai-tencent "sudo systemctl cat edit-business | grep ExecStart"
```

**预期输出**：
```
ExecStart=/var/www/edit-business/edit-api
```

---

## 🔥 高频错误警示

### 🚨 二进制文件名错误

**症状**: systemd 启动失败，提示 "file not found"

**原因**: 二进制文件名与 systemd 配置中的 `ExecStart` 不匹配

**检查**：
```bash
# 查看服务配置
ssh shanghai-tencent "sudo systemctl cat edit-business | grep ExecStart"

# 查看实际文件
ssh shanghai-tencent "ls -la /var/www/edit-business/ | grep -E 'edit-|^total'"
```

**解决**: 确保二进制文件名为 `edit-api`

---

### 🚨 环境变量丢失

**症状**: 服务启动但无法连接数据库

**原因**: 部署脚本错误地上传了 `.env` 文件

**检查**：
```bash
ssh shanghai-tencent "cat /var/www/edit-business/.env"
```

**解决**：
1. 从备份恢复 `.env` 文件
2. 修改部署脚本，确保不上传 `.env`

---

### 🚨 前端构建缓存

**症状**: 前端更新未生效

**原因**: 浏览器缓存或构建缓存

**检查**：
```bash
# 检查前端文件时间戳
ssh shanghai-tencent "ls -la /var/www/edit-business-frontend/index.html"

# 清除本地浏览器缓存后重新访问
```

**解决**：
```bash
# 强制刷新浏览器（Ctrl+Shift+R 或 Cmd+Shift+R）
# 或在隐私模式/无痕模式测试
```

---

## 📋 部署后验证（3步）

### 1. 服务状态检查

```bash
ssh shanghai-tencent "sudo systemctl status edit-business"
```

**预期**: `active (running)` 绿色状态

---

### 2. 日志检查

```bash
ssh shanghai-tencent "sudo journalctl -u edit-business -n 20 --no-pager"
```

**预期**:
- ✅ 无 ERROR 级别日志
- ✅ "Database connection established successfully"
- ✅ "Starting server on 0.0.0.0:8084"

---

### 3. 功能检查

```bash
# 健康检查
ssh shanghai-tencent "curl -s -o /dev/null -w '%{http_code}' http://localhost:8084/health"
# 预期：200

# API 测试
ssh shanghai-tencent "curl -s http://localhost:8084/api/v1/stats"
# 预期：返回 JSON（可能有认证错误）

# 前端测试（从服务器内部）
ssh shanghai-tencent "curl -s -o /dev/null -w '%{http_code}' https://edit.crazyaigc.com/"
# 预期：200
```

---

## 🎯 快速参考

### 系统信息卡

```bash
系统名: edit-business
仓库: superxia01/edit-business
本地路径: /Users/xia/Documents/GitHub/edit-business
后端目录: /var/www/edit-business
前端目录: /var/www/edit-business-frontend
二进制: edit-api
服务名: edit-business
端口: 8084
域名: edit.crazyaigc.com
```

### 常用命令

```bash
# 部署
./scripts/deploy-production.sh

# 查看状态
ssh shanghai-tencent "sudo systemctl status edit-business"

# 查看日志
ssh shanghai-tencent "sudo journalctl -u edit-business -f"

# 重启服务
ssh shanghai-tencent "sudo systemctl restart edit-business"

# 查看 Nginx 配置
ssh shanghai-tencent "sudo nginx -t"

# 重载 Nginx
ssh shanghai-tencent "sudo systemctl reload nginx"
```

---

## 💡 记住这3条

1. **二进制名必须是 `edit-api`**（不是 edit-business）
2. **部署不上传 `.env`**（环境变量独立管理）
3. **本地构建，上传产物**（不在服务器编译）

---

## 📖 相关文档

- **完整部署说明**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **脚本使用说明**: [scripts/README.md](./scripts/README.md)
- **KeenChase 规范**: [keenchase-standards/deployment-and-operations.md](https://github.com/keenchase/keenchase-standards/blob/main/deployment-and-operations.md)

---

**最后更新**: 2026-02-05
**维护者**: KeenChase Dev Team
