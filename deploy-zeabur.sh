#!/bin/bash

# Zeabur快速部署脚本
echo "🚀 开始部署到Zeabur..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必要文件
echo -e "${BLUE}📋 检查项目文件...${NC}"
required_files=("Dockerfile" "zeabur.json" "server/oauth-proxy-fixed.cjs" "package.json")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ 缺少必要文件: $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ 所有必要文件检查通过${NC}"

# 检查环境变量
echo -e "${BLUE}🔧 检查环境变量...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  未找到.env文件，请确保已配置环境变量${NC}"
fi

# 显示部署信息
echo -e "${BLUE}📊 部署信息:${NC}"
echo "项目名称: feishu-oauth-proxy"
echo "部署平台: Zeabur"
echo "服务端口: 3001"
echo "健康检查: /health"

# 显示下一步操作
echo -e "${GREEN}🎯 下一步操作:${NC}"
echo "1. 访问 https://zeabur.cn/dashboard"
echo "2. 创建新项目"
echo "3. 选择Docker部署"
echo "4. 拖拽项目文件夹到上传区域"
echo "5. 配置环境变量（参考zeabur-env.example）"
echo "6. 点击部署"

# 显示环境变量配置
echo -e "${YELLOW}🔑 需要配置的环境变量:${NC}"
echo "VITE_FEISHU_APP_ID=cli_a82431fcbfbcd00c"
echo "VITE_FEISHU_APP_SECRET=your_app_secret_here"
echo "VITE_FEISHU_REDIRECT_URI=https://your-app-name.zeabur.app/feishu/oauth/callback"
echo "VITE_FEISHU_PROXY_BASE_URL=https://your-app-name.zeabur.app"
echo "NODE_ENV=production"
echo "PORT=3001"

echo -e "${GREEN}✅ 部署准备完成！${NC}"
echo -e "${BLUE}📖 详细步骤请参考: Zeabur部署指南.md${NC}"
