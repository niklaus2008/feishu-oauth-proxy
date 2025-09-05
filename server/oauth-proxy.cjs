const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = 3001;

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
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: FEISHU_CONFIG.appId,
        app_secret: FEISHU_CONFIG.appSecret,
        grant_type: 'authorization_code',
        code: code
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
    
    if (tokenData.code !== 0) {
      console.error('飞书API返回错误:', tokenData);
      return res.status(400).json({
        success: false,
        error: `飞书API错误: ${tokenData.msg || '未知错误'}`
      });
    }
    
    const data = tokenData.data;
    
    // 返回标准化的令牌数据
    res.json({
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      expires_in: data.expires_in || 7200,
      scope: data.scope || ''
    });
    
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
    
    // 返回成功页面，包含授权码信息
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
        <p>您现在可以关闭此窗口，返回应用程序。</p>
        <script>
          // 自动关闭窗口（如果是从弹窗打开的）
          setTimeout(() => {
            if (window.opener) {
              window.close();
            }
          }, 3000);
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
 * OAuth回调处理 - 根路径（向后兼容）
 */
app.get('/', (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    console.log('收到OAuth回调（根路径）:', { code: code ? '已获取' : '未获取', state, error });
    
    if (error) {
      console.error('OAuth授权错误:', error);
      return res.status(400).json({
        success: false,
        error: `OAuth授权失败: ${error}`
      });
    }
    
    if (!code) {
      console.error('缺少授权码');
      return res.status(400).json({
        success: false,
        error: '缺少授权码'
      });
    }
    
    // 返回成功页面，包含授权码信息
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
        <p>您现在可以关闭此窗口，返回应用程序。</p>
        <script>
          // 自动关闭窗口（如果是从弹窗打开的）
          setTimeout(() => {
            if (window.opener) {
              window.close();
            }
          }, 3000);
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
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OAuth代理服务器运行正常',
    timestamp: new Date().toISOString(),
    config: {
      appId: FEISHU_CONFIG.appId ? '已配置' : '未配置',
      appSecret: FEISHU_CONFIG.appSecret ? '已配置' : '未配置'
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 OAuth代理服务器启动成功！`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🔐 飞书应用ID: ${FEISHU_CONFIG.appId}`);
  console.log(`🔑 飞书应用密钥: ${FEISHU_CONFIG.appSecret ? '已配置' : '未配置'}`);
  console.log(`📋 健康检查: http://localhost:${PORT}/health`);
  console.log(`🔄 令牌交换: http://localhost:${PORT}/feishu/oauth/token`);
  console.log(`🔄 令牌刷新: http://localhost:${PORT}/feishu/oauth/refresh`);
});

module.exports = app;
