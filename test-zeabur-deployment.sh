#!/bin/bash

# Zeabur部署测试脚本
echo "🧪 开始测试Zeabur部署..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取部署URL
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  请提供部署URL作为参数${NC}"
    echo "用法: ./test-zeabur-deployment.sh https://your-app-name.zeabur.app"
    exit 1
fi

DEPLOY_URL=$1
echo -e "${BLUE}🎯 测试目标: $DEPLOY_URL${NC}"

# 测试函数
test_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local data=$3
    local expected_status=${4:-200}
    
    echo -e "${BLUE}📡 测试 $method $endpoint${NC}"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$DEPLOY_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" "$DEPLOY_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ 成功 (HTTP $http_code)${NC}"
        echo "响应: $body"
    else
        echo -e "${RED}❌ 失败 (HTTP $http_code, 期望 $expected_status)${NC}"
        echo "响应: $body"
    fi
    echo ""
}

# 1. 测试健康检查
echo -e "${YELLOW}🔍 1. 健康检查测试${NC}"
test_endpoint "/health"

# 2. 测试OAuth回调页面
echo -e "${YELLOW}🔍 2. OAuth回调页面测试${NC}"
test_endpoint "/feishu/oauth/callback?code=test&state=test"

# 3. 测试令牌交换API（使用测试数据）
echo -e "${YELLOW}🔍 3. 令牌交换API测试${NC}"
test_data='{"code": "test_code", "app_id": "cli_a82431fcbfbcd00c"}'
test_endpoint "/feishu/oauth/token" "POST" "$test_data" "400"  # 期望400，因为测试码无效

# 4. 测试用户信息API（使用测试数据）
echo -e "${YELLOW}🔍 4. 用户信息API测试${NC}"
test_data='{"access_token": "test_token"}'
test_endpoint "/feishu/user/info" "POST" "$test_data" "400"  # 期望400，因为测试token无效

# 5. 测试CORS配置
echo -e "${YELLOW}🔍 5. CORS配置测试${NC}"
echo -e "${BLUE}📡 测试OPTIONS请求${NC}"
cors_response=$(curl -s -w "\n%{http_code}" -X OPTIONS \
    -H "Origin: https://example.com" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "$DEPLOY_URL/feishu/oauth/token")

cors_http_code=$(echo "$cors_response" | tail -n1)
cors_headers=$(curl -s -I -X OPTIONS \
    -H "Origin: https://example.com" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "$DEPLOY_URL/feishu/oauth/token" | grep -i "access-control")

if [ "$cors_http_code" = "200" ]; then
    echo -e "${GREEN}✅ CORS预检请求成功${NC}"
    echo "CORS头信息: $cors_headers"
else
    echo -e "${RED}❌ CORS预检请求失败 (HTTP $cors_http_code)${NC}"
fi
echo ""

# 6. 测试响应时间
echo -e "${YELLOW}🔍 6. 响应时间测试${NC}"
echo -e "${BLUE}📡 测试健康检查响应时间${NC}"
response_time=$(curl -s -w "%{time_total}" -o /dev/null "$DEPLOY_URL/health")
echo -e "${GREEN}✅ 响应时间: ${response_time}s${NC}"
echo ""

# 7. 测试SSL证书
echo -e "${YELLOW}🔍 7. SSL证书测试${NC}"
echo -e "${BLUE}📡 检查SSL证书${NC}"
ssl_info=$(echo | openssl s_client -servername $(echo $DEPLOY_URL | sed 's|https://||' | sed 's|/.*||') -connect $(echo $DEPLOY_URL | sed 's|https://||' | sed 's|/.*||'):443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

if [ -n "$ssl_info" ]; then
    echo -e "${GREEN}✅ SSL证书有效${NC}"
    echo "证书信息: $ssl_info"
else
    echo -e "${RED}❌ SSL证书检查失败${NC}"
fi
echo ""

# 总结
echo -e "${YELLOW}📊 测试总结${NC}"
echo "部署URL: $DEPLOY_URL"
echo "测试时间: $(date)"
echo ""
echo -e "${GREEN}🎉 测试完成！${NC}"
echo -e "${BLUE}💡 如果所有测试都通过，说明部署成功！${NC}"
echo -e "${YELLOW}⚠️  如果有测试失败，请检查部署日志和配置${NC}"
