# PromptFairy 多租户支持实施计划

## 📋 项目概述

**目标**：实现"用户自配置凭证"模式，支持用户在不同飞书租户中使用 PromptFairy，解决跨租户访问多维表格的权限问题。

**核心方案**：用户在自己的飞书租户创建自建应用，在插件中配置自己的 `app_id` 和 `app_secret`，实现多租户隔离和权限管理。

## 🎯 实施目标

- ✅ 支持无限数量的用户和租户
- ✅ 用户完全掌控自己的应用凭证
- ✅ 保持现有功能不变
- ✅ 提供友好的用户配置体验
- ✅ 确保安全性和数据隔离

## 🏗️ 技术架构设计

### 架构流程图

```
用户租户A                    代理服务器                     飞书API
    ↓                          ↓                          ↓
用户创建应用A              接收用户凭证A                使用凭证A调用API
(app_id_A, secret_A)   →   动态验证凭证A              →   返回租户A数据
                           
用户租户B                    
    ↓                          
用户创建应用B              接收用户凭证B                使用凭证B调用API  
(app_id_B, secret_B)   →   动态验证凭证B              →   返回租户B数据
```

### 数据流设计

```javascript
// 1. 用户配置流程
用户输入凭证 → 本地存储 → 验证有效性 → 启用功能

// 2. OAuth授权流程  
前端发起授权 → 传递用户凭证 → 代理服务器验证 → 飞书OAuth → 返回token

// 3. API调用流程
API请求 → 携带用户凭证 → 代理服务器动态使用 → 飞书API → 返回结果
```

## 🎨 用户界面设计

### 新增配置页面：应用凭证设置

```
┌─────────────────────────────────────┐
│              应用凭证配置              │
├─────────────────────────────────────┤
│                                     │
│  🔧 飞书应用配置                     │
│                                     │
│  App ID: [___________________]      │
│                                     │
│  App Secret: [___________________]  │
│                                     │
│  📋 表格链接:                        │
│  [___________________________]     │
│                                     │
│  [测试连接]  [保存配置]              │
│                                     │
│  ℹ️ 使用指南: 如何创建飞书应用 →      │
│                                     │
└─────────────────────────────────────┘
```

### 配置状态指示

```
✅ 已配置且有效     - 绿色指示器
⚠️  已配置但无效     - 黄色指示器  
❌ 未配置           - 红色指示器
🔄 配置验证中       - 蓝色加载指示器
```

## 💻 代码改动计划

### 1. 前端改动 (src/)

#### 1.1 新增用户凭证配置组件
```typescript
// src/components/UserCredentialsConfig.tsx
interface UserCredentials {
  appId: string;
  appSecret: string;
  tableUrl: string;
  isValid?: boolean;
}

export const UserCredentialsConfig: React.FC = () => {
  // 凭证输入、验证、保存逻辑
};
```

#### 1.2 修改飞书配置 (src/config/feishu.ts)
```typescript
// 支持用户自定义凭证
export class FeishuConfig {
  getUserCredentials(): UserCredentials | null;
  setUserCredentials(credentials: UserCredentials): void;
  validateCredentials(credentials: UserCredentials): Promise<boolean>;
}
```

#### 1.3 更新OAuth服务 (src/services/feishuOAuthService.ts)
```typescript
// 使用用户提供的凭证进行OAuth
export class FeishuOAuthService {
  async exchangeCodeForToken(code: string, userCredentials: UserCredentials): Promise<FeishuAuthToken>;
}
```

#### 1.4 修改飞书设置页面 (src/pages/FeishuSettings.tsx)
- 添加"应用凭证配置"区域
- 集成凭证验证功能
- 添加使用指南链接

### 2. 代理服务器改动 (server/)

#### 2.1 支持动态凭证验证
```javascript
// server/oauth-proxy-fixed.cjs

// 验证用户提供的凭证
async function validateUserCredentials(appId, appSecret) {
  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const data = await response.json();
    return data.code === 0;
  } catch (error) {
    return false;
  }
}

// 修改token交换接口
app.post('/feishu/oauth/token', async (req, res) => {
  const { code, app_id, app_secret } = req.body;
  
  // 验证用户凭证
  const isValid = await validateUserCredentials(app_id, app_secret);
  if (!isValid) {
    return res.status(400).json({ success: false, error: '应用凭证无效' });
  }
  
  // 使用用户凭证进行OAuth
  const tokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: app_id,      // 用户提供
      client_secret: app_secret, // 用户提供  
      code: code,
      redirect_uri: process.env.VITE_FEISHU_REDIRECT_URI
    })
  });
  
  // 返回结果
  const tokenData = await tokenResponse.json();
  res.json({ success: true, ...tokenData });
});
```

#### 2.2 添加凭证验证接口
```javascript
// 新增凭证验证端点
app.post('/feishu/validate-credentials', async (req, res) => {
  const { app_id, app_secret } = req.body;
  const isValid = await validateUserCredentials(app_id, app_secret);
  res.json({ valid: isValid });
});
```

### 3. 数据存储改动

#### 3.1 本地存储结构
```typescript
// LocalStorage 存储用户凭证
interface StoredUserCredentials {
  appId: string;
  appSecret: string; // 考虑加密存储
  tableUrl: string;
  createdAt: number;
  lastValidated: number;
}
```

## 🔒 安全考虑

### 1. 凭证保护
```typescript
// 前端凭证加密存储
class CredentialsManager {
  private encrypt(data: string): string {
    // 使用简单的编码（非真正加密，但增加安全性）
    return btoa(data);
  }
  
  private decrypt(data: string): string {
    return atob(data);
  }
  
  saveCredentials(credentials: UserCredentials): void {
    const encrypted = {
      ...credentials,
      appSecret: this.encrypt(credentials.appSecret)
    };
    localStorage.setItem('user_feishu_credentials', JSON.stringify(encrypted));
  }
}
```

### 2. 输入验证
```typescript
// 凭证格式验证
function validateCredentialsFormat(credentials: UserCredentials): boolean {
  const appIdPattern = /^cli_[a-zA-Z0-9]+$/;
  const tableUrlPattern = /^https:\/\/[a-zA-Z0-9]+\.feishu\.cn\/base\/[a-zA-Z0-9]+/;
  
  return appIdPattern.test(credentials.appId) && 
         credentials.appSecret.length >= 10 &&
         tableUrlPattern.test(credentials.tableUrl);
}
```

### 3. 错误处理和日志
```javascript
// 代理服务器安全日志
function logSecurityEvent(event, details) {
  console.log(`[SECURITY] ${new Date().toISOString()} - ${event}:`, {
    ...details,
    app_secret: '[REDACTED]' // 不记录敏感信息
  });
}
```

## 📅 实施步骤和时间表

### 第一阶段：基础架构 (2-3天)

**Day 1: 代理服务器改造**
- [ ] 修改OAuth token交换接口支持动态凭证
- [ ] 添加凭证验证接口
- [ ] 添加安全验证和错误处理
- [ ] 本地测试代理服务器功能

**Day 2: 前端基础组件**
- [ ] 创建UserCredentialsConfig组件
- [ ] 修改FeishuConfig类支持用户凭证
- [ ] 更新本地存储逻辑
- [ ] 添加凭证加密/解密功能

**Day 3: 集成测试**
- [ ] 集成前端和代理服务器
- [ ] 测试凭证验证流程
- [ ] 测试OAuth授权流程
- [ ] 修复发现的问题

### 第二阶段：用户界面 (2天)

**Day 4: UI实现**
- [ ] 在FeishuSettings页面添加凭证配置区域
- [ ] 实现配置状态指示器
- [ ] 添加表单验证和用户反馈
- [ ] 优化用户体验

**Day 5: 功能完善**
- [ ] 添加配置导入/导出功能
- [ ] 实现配置测试连接功能
- [ ] 添加错误提示和帮助文档
- [ ] UI细节优化

### 第三阶段：测试和文档 (2天)

**Day 6: 全面测试**
- [ ] 多租户场景测试
- [ ] 错误场景测试
- [ ] 安全性测试
- [ ] 性能测试

**Day 7: 文档和发布准备**
- [ ] 编写用户使用指南
- [ ] 创建应用创建教程
- [ ] 准备发布文档
- [ ] 最终验收测试

## 🧪 测试方案

### 1. 单元测试
```typescript
// 凭证验证测试
describe('UserCredentials', () => {
  test('应该验证有效的凭证格式', () => {
    const validCredentials = {
      appId: 'cli_test12345',
      appSecret: 'test_secret_123',
      tableUrl: 'https://test.feishu.cn/base/test123'
    };
    expect(validateCredentialsFormat(validCredentials)).toBe(true);
  });
});
```

### 2. 集成测试
```javascript
// 代理服务器测试
describe('Proxy Server', () => {
  test('应该接受有效的用户凭证', async () => {
    const response = await request(app)
      .post('/feishu/validate-credentials')
      .send({ app_id: 'valid_app_id', app_secret: 'valid_secret' });
    expect(response.body.valid).toBe(true);
  });
});
```

### 3. 端到端测试
- [ ] 用户创建飞书应用
- [ ] 配置凭证到插件
- [ ] 完成OAuth授权
- [ ] 测试多维表格同步功能
- [ ] 验证跨租户隔离

## 📖 用户使用指南

### 快速开始

#### 步骤1：创建飞书自建应用
1. 登录飞书开放平台 (https://open.feishu.cn/)
2. 选择"创建应用" → "自建应用"
3. 填写应用基本信息：
   - 应用名称：PromptFairy (或自定义)
   - 应用描述：个人提示词管理工具
4. 记录生成的 App ID 和 App Secret

#### 步骤2：配置应用权限
在应用管理页面，添加以下权限：
- `bitable:app` - 多维表格应用权限
- `bitable:app:readonly` - 多维表格只读权限  
- `base:record:retrieve` - 读取记录权限
- `base:record:create` - 创建记录权限
- `base:record:write` - 更新记录权限

#### 步骤3：设置回调地址
在"安全设置"中添加回调域名：
- 开发环境：`http://localhost:3001`
- 生产环境：`https://your-domain.com`

#### 步骤4：在插件中配置凭证
1. 打开PromptFairy插件
2. 进入"飞书设置"
3. 在"应用凭证配置"区域填入：
   - App ID: 从步骤1获得
   - App Secret: 从步骤1获得  
   - 表格链接: 你的飞书多维表格链接
4. 点击"测试连接"验证配置
5. 点击"保存配置"

#### 步骤5：完成授权
1. 点击"立即授权"
2. 在飞书授权页面同意权限申请
3. 完成授权后返回插件

#### 步骤6：开始使用
现在可以正常使用"从飞书拉取"和"同步到飞书"功能！

### 常见问题

#### Q: 如何获取表格链接？
A: 在飞书多维表格中，点击右上角"分享"按钮，复制链接即可。

#### Q: 配置后提示"凭证无效"？
A: 请检查：
1. App ID 和 App Secret 是否正确
2. 应用是否已启用
3. 权限是否正确配置
4. 网络连接是否正常

#### Q: 授权时没有看到多维表格权限？
A: 请确保在飞书开放平台中已正确配置所需权限。

#### Q: 多个租户如何切换？
A: 每次使用不同租户的表格时，需要重新配置对应的凭证。

## 🔧 故障排除

### 1. 常见错误代码
- `400 - 应用凭证无效`: 检查App ID和App Secret
- `403 - 权限不足`: 检查应用权限配置
- `404 - 应用不存在`: 检查App ID是否正确
- `500 - 服务器错误`: 检查代理服务器状态

### 2. 调试模式
在开发者工具Console中查看详细日志：
```
=== 飞书授权URL调试信息 ===
🔗 生成的授权URL: https://...
📋 权限范围 (scope): bitable:app bitable:app:readonly base:record:retrieve
🆔 应用ID: cli_xxx...
```

### 3. 重置配置
如果遇到问题，可以：
1. 在飞书设置中点击"取消授权"
2. 清除本地存储的凭证
3. 重新配置凭证和授权

## 🚀 未来优化方向

### 1. 用户体验优化
- [ ] 一键导入表格链接和凭证
- [ ] 支持多套凭证配置和快速切换
- [ ] 添加配置备份和恢复功能

### 2. 安全性增强  
- [ ] 使用更强的加密算法保护凭证
- [ ] 添加凭证过期检测和自动刷新
- [ ] 实现更完善的权限验证

### 3. 功能扩展
- [ ] 支持团队共享配置
- [ ] 添加批量配置功能
- [ ] 集成更多飞书应用类型

## 📝 总结

本实施计划采用"用户自配置凭证"模式，通过让用户创建和管理自己的飞书应用凭证，实现了：

✅ **多租户支持** - 支持无限数量的用户和租户
✅ **权限隔离** - 每个用户只能访问自己有权限的数据  
✅ **安全可控** - 用户完全掌控自己的应用凭证
✅ **易于扩展** - 无需预配置，支持动态添加用户
✅ **向后兼容** - 保持现有功能不变

通过7天的分阶段实施，可以快速实现多租户支持，解决跨租户访问飞书多维表格的权限问题，为后续的功能扩展和用户增长奠定坚实基础。
