# Zeabur部署指南 - 飞书OAuth代理服务

## 📋 **部署前准备**

### 1. 注册Zeabur账号
- 访问 [https://zeabur.cn/](https://zeabur.cn/)
- 点击 "Get Started" 注册账号
- 完成邮箱验证

### 2. 准备项目文件
确保您的项目包含以下文件：
```
prompt-fairy-helper/
├── Dockerfile                 # Docker配置文件
├── zeabur.json               # Zeabur配置文件
├── .dockerignore             # Docker忽略文件
├── zeabur-env.example        # 环境变量示例
├── server/
│   └── oauth-proxy-fixed.cjs # 代理服务器
├── package.json              # Node.js依赖
└── .env                      # 本地环境变量
```

## 🚀 **部署步骤**

### 步骤1：登录Zeabur控制台
1. 访问 [https://zeabur.cn/dashboard](https://zeabur.cn/dashboard)
2. 使用您的账号登录

### 步骤2：创建新项目
1. 点击 "New Project" 按钮
2. 输入项目名称：`feishu-oauth-proxy`
3. 选择项目类型：`Docker`

### 步骤3：上传代码
**方法一：拖拽上传（推荐）**
1. 将整个项目文件夹拖拽到上传区域
2. Zeabur会自动检测到Dockerfile并开始构建

**方法二：Git仓库连接**
1. 将代码推送到GitHub/GitLab
2. 在Zeabur中连接Git仓库
3. 选择分支和构建目录

### 步骤4：配置环境变量
在Zeabur控制台中设置以下环境变量：

```bash
# 飞书应用配置
VITE_FEISHU_APP_ID=cli_a82431fcbfbcd00c
VITE_FEISHU_APP_SECRET=your_actual_app_secret

# OAuth回调URL（部署后更新）
VITE_FEISHU_REDIRECT_URI=https://your-app-name.zeabur.app/feishu/oauth/callback

# 代理服务器配置
VITE_FEISHU_PROXY_BASE_URL=https://your-app-name.zeabur.app

# 系统配置
NODE_ENV=production
PORT=3001
```

### 步骤5：部署配置
1. **端口设置**：确保设置为 `3001`
2. **健康检查**：路径设置为 `/health`
3. **资源限制**：
   - CPU: 0.1 cores
   - 内存: 128MB
4. **扩缩容**：
   - 最小实例: 1
   - 最大实例: 3

### 步骤6：开始部署
1. 点击 "Deploy" 按钮
2. 等待构建完成（通常需要2-5分钟）
3. 查看部署日志确认成功

## 🔧 **部署后配置**

### 1. 获取部署域名
部署成功后，Zeabur会提供一个默认域名：
```
https://your-app-name.zeabur.app
```

### 2. 更新飞书应用配置
1. 登录飞书开放平台
2. 进入您的应用管理页面
3. 更新以下配置：
   - **重定向URI**: `https://your-app-name.zeabur.app/feishu/oauth/callback`
   - **服务器地址**: `https://your-app-name.zeabur.app`

### 3. 更新前端代码
修改前端代码中的API端点：

```javascript
// 更新API基础URL
const API_BASE_URL = 'https://your-app-name.zeabur.app';

// 更新重定向URI
const REDIRECT_URI = 'https://your-app-name.zeabur.app/feishu/oauth/callback';
```

## 🧪 **测试验证**

### 1. 健康检查
访问：`https://your-app-name.zeabur.app/health`
应该返回：
```json
{
  "status": "healthy",
  "timestamp": "2025-01-05T12:00:00.000Z",
  "service": "feishu-oauth-proxy"
}
```

### 2. OAuth流程测试
1. 启动Chrome插件
2. 点击授权按钮
3. 完成飞书授权
4. 检查是否成功获取用户信息

### 3. API端点测试
```bash
# 测试令牌交换
curl -X POST https://your-app-name.zeabur.app/feishu/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"code": "test_code", "app_id": "cli_a82431fcbfbcd00c"}'

# 测试用户信息获取
curl -X POST https://your-app-name.zeabur.app/feishu/user/info \
  -H "Content-Type: application/json" \
  -d '{"access_token": "your_access_token"}'
```

## 📊 **监控和维护**

### 1. 日志查看
- 在Zeabur控制台中查看实时日志
- 监控错误和性能指标

### 2. 性能监控
- CPU使用率
- 内存使用率
- 响应时间
- 请求数量

### 3. 成本控制
- 监控资源使用情况
- 设置告警阈值
- 优化资源配置

## 🔒 **安全配置**

### 1. 环境变量安全
- 不要在代码中硬编码敏感信息
- 使用Zeabur的环境变量功能
- 定期轮换密钥

### 2. 网络安全
- 启用HTTPS（Zeabur自动提供）
- 配置CORS策略
- 限制访问来源

### 3. 访问控制
- 设置IP白名单（如需要）
- 配置API限流
- 监控异常访问

## 🚨 **常见问题解决**

### 1. 构建失败
**问题**：Docker构建失败
**解决**：
- 检查Dockerfile语法
- 确认所有依赖文件存在
- 查看构建日志定位问题

### 2. 服务启动失败
**问题**：容器启动后立即退出
**解决**：
- 检查环境变量配置
- 确认端口设置正确
- 查看启动日志

### 3. OAuth回调失败
**问题**：授权后回调失败
**解决**：
- 检查重定向URI配置
- 确认域名解析正确
- 验证HTTPS证书

### 4. 性能问题
**问题**：响应时间过长
**解决**：
- 增加资源配额
- 优化代码逻辑
- 启用缓存机制

## 📞 **技术支持**

如果遇到问题，可以通过以下方式获取帮助：
- Zeabur官方文档：[https://zeabur.cn/docs](https://zeabur.cn/docs)
- Zeabur Discord社区
- 项目GitHub Issues

## 🎉 **部署完成**

恭喜！您的飞书OAuth代理服务已成功部署到Zeabur平台。现在您可以：
- 享受全球CDN加速
- 自动扩缩容
- 按使用量付费
- 零运维管理

记得定期监控服务状态和成本使用情况！
