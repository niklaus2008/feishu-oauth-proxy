# 飞书OAuth代理服务

为Chrome插件提供飞书OAuth认证代理服务，支持多租户模式。

## 功能特性

- 🏢 **多租户支持** - 支持用户自定义飞书应用凭证
- 🔐 **动态凭证验证** - 自动验证用户提供的App ID和App Secret
- 🔄 **飞书OAuth 2.0授权码流程** - 完整的OAuth认证流程
- 🔄 **令牌交换和刷新** - 支持访问令牌和刷新令牌管理
- 👤 **用户信息获取** - 获取飞书用户基本信息
- 🌐 **CORS支持** - 跨域请求支持
- 🔍 **健康检查** - 服务状态监控
- 🔒 **安全日志** - 详细的安全事件记录
- ⚡ **向后兼容** - 保持与现有单租户模式的兼容性

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 部署到Zeabur

```bash
# 部署到生产环境
npm run deploy
```

## API端点

### 基础端点
- `GET /health` - 健康检查（显示多租户支持状态）

### OAuth认证端点
- `POST /feishu/oauth/token` - 令牌交换（支持多租户动态凭证）
- `POST /feishu/oauth/refresh` - 令牌刷新（支持多租户动态凭证）
- `GET /feishu/oauth/callback` - OAuth回调处理

### 用户管理端点
- `POST /feishu/user/info` - 用户信息获取

### 多租户端点
- `POST /feishu/validate-credentials` - 验证用户凭证

## 多租户使用说明

### 用户凭证配置
用户可以在前端提供自己的飞书应用凭证：

```javascript
// 令牌交换请求
{
  "code": "authorization_code",
  "app_id": "cli_user_app_id",      // 用户的应用ID
  "app_secret": "user_app_secret"   // 用户的应用密钥
}

// 凭证验证请求
{
  "app_id": "cli_user_app_id",
  "app_secret": "user_app_secret"
}
```

### 向后兼容性
如果不提供用户凭证，系统将使用默认配置：

```javascript
// 使用默认配置的请求
{
  "code": "authorization_code",
  "app_id": "default_app_id"  // 只提供app_id，使用默认配置
}
```

## 环境变量

```bash
# 默认飞书应用配置（用于向后兼容）
VITE_FEISHU_APP_ID=your_default_app_id
VITE_FEISHU_APP_SECRET=your_default_app_secret

# OAuth回调地址
VITE_FEISHU_REDIRECT_URI=your_redirect_uri

# 服务器配置
NODE_ENV=production
PORT=3001
```

## 安全特性

- 🔒 **凭证验证** - 自动验证用户提供的飞书应用凭证
- 📝 **安全日志** - 记录所有安全相关事件，敏感信息自动脱敏
- 🛡️ **输入验证** - 严格的参数格式验证
- 🔐 **错误处理** - 详细的错误信息和安全提示

## 测试

服务器启动后，可以通过以下方式测试多租户功能：

```bash
# 健康检查
curl http://localhost:3001/health

# 凭证验证
curl -X POST -H "Content-Type: application/json" \
  -d '{"app_id":"cli_test123","app_secret":"test_secret"}' \
  http://localhost:3001/feishu/validate-credentials
```

## 更新日志

### v2.0.0 - 多租户支持
- ✅ 新增多租户支持，用户可配置自定义飞书应用凭证
- ✅ 新增凭证验证接口 `/feishu/validate-credentials`
- ✅ 增强OAuth token交换和刷新接口支持动态凭证
- ✅ 新增安全日志记录功能
- ✅ 保持向后兼容性
- ✅ 完善错误处理和输入验证

## 许可证

MIT
