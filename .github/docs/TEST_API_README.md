# ModelScope API 测试脚本使用说明

## 安全说明

⚠️ **重要**: 请勿在代码中硬编码 API Key！

本测试脚本使用环境变量来提供 API Key，确保安全性。

## 使用方法

### 方法 1: 临时环境变量

```bash
MODELSCOPE_API_KEY=your-api-key node test-modelscope-api.js
```

### 方法 2: 导出环境变量

```bash
export MODELSCOPE_API_KEY=your-api-key
node test-modelscope-api.js
```

### 方法 3: 使用 .env 文件（推荐）

1. 创建 `.env` 文件（已在 .gitignore 中）:
   ```bash
   echo "MODELSCOPE_API_KEY=your-api-key" > .env
   ```

2. 使用 dotenv 加载:
   ```bash
   npm install dotenv
   node -r dotenv/config test-modelscope-api.js
   ```

## 获取 API Key

1. 访问 [ModelScope 魔塔社区](https://www.modelscope.cn/)
2. 登录后进入个人中心
3. 进入 [Access Token 管理](https://www.modelscope.cn/my/myaccesstoken)
4. 创建新的 Token
5. 复制 Token（格式：`ms-xxxxxxxx...`）

## 测试输出

成功运行后，你会看到：

```
🧪 开始测试 ModelScope API...

📝 测试提交记录数量: 5
🔑 API Key: ms-458cad0...7891feaf41

📡 发送 API 请求...
📊 响应状态: 200 OK

✅ API 调用成功!

📋 AI 生成的总结（清理后）:
────────────────────────────────────────────────────────────
- 添加 amd64-v3 优化版本构建支持
- 优先使用用户设置的代理
- 修复下载进度条显示问题
...
────────────────────────────────────────────────────────────

📊 Token 使用情况:
   输入 tokens: 265
   输出 tokens: 48
   总计 tokens: 313
```

## 故障排查

### 错误: 未设置 MODELSCOPE_API_KEY 环境变量

**原因**: 没有提供 API Key

**解决**: 使用上述方法之一设置环境变量

### 错误: API 请求失败: 401

**原因**: API Key 无效或过期

**解决**:
1. 检查 API Key 是否正确
2. 重新生成 API Key
3. 确认 API Key 已正确设置

### 错误: fetch failed

**原因**: 网络连接问题

**解决**:
1. 检查网络连接
2. 确认可以访问 api-inference.modelscope.cn
3. 稍后重试

## 安全最佳实践

1. ✅ **使用环境变量** - 不要硬编码 API Key
2. ✅ **添加到 .gitignore** - 确保 .env 文件不被提交
3. ✅ **定期轮换** - 定期更换 API Key
4. ✅ **最小权限** - 只授予必要的权限
5. ✅ **监控使用** - 定期检查 API 使用情况

## 相关文档

- [ModelScope API 配置指南](MODELSCOPE_API_GUIDE.md)
- [Release 工作流优化指南](RELEASE_WORKFLOW_GUIDE.md)
