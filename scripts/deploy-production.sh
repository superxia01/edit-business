#!/bin/bash
# ============================================
# Edit Business 生产环境部署脚本
# ============================================
#
# 使用说明：
# 1. 确保 scripts/ops/config.sh 已配置
# 2. 添加可执行权限：chmod +x scripts/deploy-production.sh
# 3. 执行部署：./scripts/deploy-production.sh
#
# 重要：
# - 此脚本不会上传 .env 文件（环境变量与代码分离）
# - 只上传二进制文件和前端静态文件
# - 使用 SSH 别名（需配置 ~/.ssh/config）
# ============================================

set -e  # 遇到错误立即退出

# ============================================
# 加载配置
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 检查配置文件是否存在
if [ ! -f "${SCRIPT_DIR}/ops/config.sh" ]; then
    echo "❌ 配置文件不存在：${SCRIPT_DIR}/ops/config.sh"
    echo "请先创建配置文件，参考 scripts/ops/config.example.sh"
    exit 1
fi

# 加载配置
source "${SCRIPT_DIR}/ops/config.sh"

# ============================================
# 颜色输出
# ============================================
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 开始部署 ${SYSTEM_NAME}...${NC}"
echo "部署目录: ${REMOTE_DIR}"
echo "前端目录: ${REMOTE_DIR}-frontend"
echo ""

# ============================================
# 前端部署
# ============================================
echo -e "\n📦 [1/3] 部署前端..."

cd "${PROJECT_ROOT}/frontend"

# 检查是否已构建
if [ ! -d "dist" ]; then
  echo "未发现 dist 目录，开始构建..."
  npm run build
fi

# 上传静态文件
echo "上传前端文件到服务器..."
rsync -avz --delete \
  --exclude '*.map' \
  --exclude '*.html.gz' \
  dist/ \
  ${SERVER}:${REMOTE_DIR}-frontend/

echo -e "${GREEN}✅ 前端部署完成${NC}"

# ============================================
# 后端部署
# ============================================
echo -e "\n📦 [2/3] 部署后端..."

cd "${PROJECT_ROOT}/backend"

# 交叉编译
echo "交叉编译 Linux 二进制..."
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
  -ldflags="-s -w" \
  -o ${BINARY_NAME} \
  cmd/server/main.go

# 验证二进制文件
file ${BINARY_NAME} | grep -q "ELF 64-bit" || {
  echo -e "${RED}❌ 编译失败：不是有效的 Linux 二进制文件${NC}"
  exit 1
}

# 上传到临时文件（避免覆盖运行中二进制导致 scp 失败）
echo "上传二进制文件到服务器..."
scp ${BINARY_NAME} ${SERVER}:${REMOTE_DIR}/${BINARY_NAME}.new

# 重启服务
echo "重启服务..."
ssh ${SERVER} << ENDSSH
cd ${REMOTE_DIR}

# 备份旧二进制
if [ -f ${BINARY_NAME} ]; then
  BACKUP_NAME="${BINARY_NAME}.backup.\$(date +%Y%m%d_%H%M%S)"
  echo "备份旧版本: \${BACKUP_NAME}"
  mv ${BINARY_NAME} \${BACKUP_NAME}
fi

# 启用新二进制
echo "启用新版本..."
mv ${BINARY_NAME}.new ${BINARY_NAME}

# 重启服务
sudo systemctl restart ${SYSTEM_NAME}

# 等待启动
sleep 3

# 检查状态
echo "检查服务状态..."
sudo systemctl status ${SYSTEM_NAME} --no-pager --lines=10
ENDSSH

echo -e "${GREEN}✅ 后端部署完成${NC}"

# ============================================
# 验证部署
# ============================================
echo -e "\n🔍 [3/3] 验证部署..."

sleep 2

# 健康检查
if curl -f -s https://${DOMAIN}/health > /dev/null; then
  echo -e "${GREEN}✅ 健康检查通过${NC}"
else
  echo -e "${YELLOW}⚠️ 健康检查失败，请手动验证${NC}"
fi

echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo "📍 访问地址："
echo "  前端: https://${DOMAIN}"
echo "  后端: https://${DOMAIN}/api"
echo ""
echo -e "${YELLOW}⚠️ 环境变量未改变（如需修改请登录服务器）${NC}"
echo "修改命令：ssh ${SERVER} \"sudo nano ${REMOTE_DIR}/.env\""
echo ""
