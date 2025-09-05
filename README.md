# 飞书OAuth代理服务

为Chrome插件提供飞书OAuth认证代理服务。

## 功能特性

- 飞书OAuth 2.0授权码流程
- 令牌交换和刷新
- 用户信息获取
- CORS支持
- 健康检查

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

- `GET /health` - 健康检查
- `POST /feishu/oauth/token` - 令牌交换
- `GET /feishu/oauth/callback` - OAuth回调
- `POST /feishu/user/info` - 用户信息获取

## 环境变量

```bash
VITE_FEISHU_APP_ID=your_app_id
VITE_FEISHU_APP_SECRET=your_app_secret
VITE_FEISHU_REDIRECT_URI=your_redirect_uri
NODE_ENV=production
PORT=3001
```

## 许可证

MIT
