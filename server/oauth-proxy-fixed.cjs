const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 飞书应用配置（从环境变量读取）
const FEISHU_CONFIG = {
  appId: process.env.VITE_FEISHU_APP_ID || 'your_app_id_here',
  appSecret: process.env.VITE_FEISHU_APP_SECRET || 'your_app_secret_here'
};

/**
 * 使用授权码交换访问令牌
 */
app.post('/feishu/oauth/token', async (req, res) => {
  try {
    const { code, app_id } = req.body;
    
    console.log('收到令牌交换请求:', { code, app_id });
    
    if (!code || !app_id) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 验证应用ID
    if (app_id !== FEISHU_CONFIG.appId) {
      return res.status(400).json({
        success: false,
        error: '应用ID不匹配'
      });
    }
    
    // 调用飞书API交换令牌
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: FEISHU_CONFIG.appId,
        client_secret: FEISHU_CONFIG.appSecret,
        code: code,
        redirect_uri: process.env.VITE_FEISHU_REDIRECT_URI || 'http://localhost:3001/feishu/oauth/callback'
      })
    });
    
    console.log('飞书API响应状态:', tokenResponse.status, tokenResponse.statusText);
    console.log('飞书API响应头:', Object.fromEntries(tokenResponse.headers.entries()));
    
    // 先获取响应文本，然后尝试解析JSON
    const responseText = await tokenResponse.text();
    console.log('飞书API响应内容:', responseText);
    
    if (!tokenResponse.ok) {
      console.error('飞书API错误:', responseText);
      return res.status(400).json({
        success: false,
        error: `飞书API错误: ${responseText || tokenResponse.statusText}`
      });
    }
    
    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('解析飞书API响应失败:', parseError);
      console.error('响应内容:', responseText);
      return res.status(400).json({
        success: false,
        error: `飞书API响应格式错误: ${parseError.message}`
      });
    }
    
    // 检查OAuth 2.0标准响应格式
    if (tokenData.error) {
      console.error('飞书API返回错误:', tokenData);
      return res.status(400).json({
        success: false,
        error: `飞书API错误: ${tokenData.error_description || tokenData.error}`
      });
    }
    
    // 检查飞书自定义响应格式
    if (tokenData.code !== undefined && tokenData.code !== 0) {
      console.error('飞书API返回错误:', tokenData);
      return res.status(400).json({
        success: false,
        error: `飞书API错误: ${tokenData.msg || '未知错误'}`
      });
    }
    
    // 处理OAuth 2.0标准响应格式
    if (tokenData.access_token) {
      res.json({
        success: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || '',
        expires_in: tokenData.expires_in || 7200,
        scope: tokenData.scope || ''
      });
    } else if (tokenData.data && tokenData.data.access_token) {
      // 处理飞书自定义响应格式
      const data = tokenData.data;
      res.json({
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
        expires_in: data.expires_in || 7200,
        scope: data.scope || ''
      });
    } else {
      console.error('未知的响应格式:', tokenData);
      return res.status(400).json({
        success: false,
        error: '未知的响应格式'
      });
    }
    
  } catch (error) {
    console.error('令牌交换失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 刷新访问令牌
 */
app.post('/feishu/oauth/refresh', async (req, res) => {
  try {
    const { refresh_token, app_id } = req.body;
    
    console.log('收到令牌刷新请求:', { app_id });
    
    if (!refresh_token || !app_id) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 验证应用ID
    if (app_id !== FEISHU_CONFIG.appId) {
      return res.status(400).json({
        success: false,
        error: '应用ID不匹配'
      });
    }
    
    // 调用飞书API刷新令牌
    const refreshResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: FEISHU_CONFIG.appId,
        app_secret: FEISHU_CONFIG.appSecret,
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      })
    });
    
    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json();
      console.error('飞书API刷新错误:', errorData);
      return res.status(400).json({
        success: false,
        error: `飞书API错误: ${errorData.msg || refreshResponse.statusText}`
      });
    }
    
    const refreshData = await refreshResponse.json();
    
    // 返回标准化的令牌数据
    res.json({
      success: true,
      access_token: refreshData.app_access_token,
      refresh_token: refreshData.refresh_token || refresh_token,
      expires_in: refreshData.expire || 7200,
      scope: refreshData.scope || ''
    });
    
  } catch (error) {
    console.error('令牌刷新失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 获取用户信息端点
app.post('/feishu/user/info', async (req, res) => {
  try {
    const { access_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: '缺少access_token参数'
      });
    }
    
    console.log('收到获取用户信息请求');
    
    // 调用飞书API获取用户信息
    const userResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('飞书用户信息API响应状态:', userResponse.status, userResponse.statusText);
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('飞书用户信息API错误:', errorText);
      return res.status(400).json({
        success: false,
        error: `飞书API错误: ${errorText || userResponse.statusText}`
      });
    }
    
    const userData = await userResponse.json();
    console.log('飞书用户信息API响应:', userData);
    
    if (userData.code !== 0) {
      console.error('飞书用户信息API返回错误:', userData);
      return res.status(400).json({
        success: false,
        error: `飞书API错误: ${userData.msg || '未知错误'}`
      });
    }
    
    // 返回用户信息
    res.json({
      success: true,
      data: userData.data
    });
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * OAuth回调处理 - 支持新的回调路径
 */
app.get('/feishu/oauth/callback', (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    console.log('收到OAuth回调:', { code: code ? '已获取' : '未获取', state, error });
    
    if (error) {
      console.error('OAuth授权错误:', error);
      return res.status(400).json({
        success: false,
        error: `OAuth授权失败: ${error}`
      });
    }
    
    if (!code) {
      console.log('缺少授权码，返回等待页面');
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth授权处理中</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .loading { color: #2196F3; }
          </style>
        </head>
        <body>
          <h1 class="loading">⏳ 正在处理授权...</h1>
          <p>请稍候，我们正在处理您的授权请求</p>
          <script>
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          </script>
        </body>
        </html>
      `);
    }
    
    // 返回成功页面，包含授权码信息并存储到localStorage
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth授权成功</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #4CAF50; }
          .info { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .code { font-family: monospace; background: #e8e8e8; padding: 10px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1 class="success">✅ OAuth授权成功！</h1>
        <div class="info">
          <p><strong>授权码已获取</strong></p>
          <p>State: <span class="code">${state || '无'}</span></p>
          <p>Code: <span class="code">${code.substring(0, 20)}...</span></p>
        </div>
        <p>正在处理授权...</p>
        <script>
          console.log('OAuth回调页面加载完成');
          console.log('授权码:', '${code}');
          console.log('状态码:', '${state}');
          
          // 将授权码存储到localStorage，供前端轮询检查使用
          try {
            localStorage.setItem('feishu_oauth_code', '${code}');
            localStorage.setItem('feishu_oauth_state', '${state}');
            localStorage.setItem('feishu_oauth_timestamp', Date.now().toString());
            
            console.log('授权码已存储到localStorage');
            
            // 尝试通过postMessage传递给父窗口
            if (window.opener) {
              window.opener.postMessage({
                type: 'FEISHU_OAUTH_CALLBACK',
                code: '${code}',
                state: '${state}',
                success: true
              }, '*');
              console.log('授权码已传递给父窗口');
            }
            
            // 延迟关闭窗口
            setTimeout(() => {
              if (window.opener) {
                window.close();
              }
            }, 1000);
          } catch (error) {
            console.error('存储授权码失败:', error);
          }
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('处理OAuth回调失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 健康检查端点
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OAuth代理服务器运行正常',
    timestamp: new Date().toISOString(),
    config: {
      appId: FEISHU_CONFIG.appId,
      hasAppSecret: !!FEISHU_CONFIG.appSecret
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 OAuth代理服务器启动成功！');
  console.log('📍 服务地址: http://localhost:' + PORT);
  console.log('🔐 飞书应用ID: ' + FEISHU_CONFIG.appId);
  console.log('🔑 飞书应用密钥: ' + (FEISHU_CONFIG.appSecret ? '已配置' : '未配置'));
  console.log('📋 健康检查: http://localhost:' + PORT + '/health');
  console.log('🔄 令牌交换: http://localhost:' + PORT + '/feishu/oauth/token');
  console.log('🔄 令牌刷新: http://localhost:' + PORT + '/feishu/oauth/refresh');
});
