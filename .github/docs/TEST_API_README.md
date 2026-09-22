# ModelScope API 测试脚本使用说明

## 安全说明

⚠️ **重要**: 请勿在代码中硬编码 API Key！

本测试脚本使用环境变量来提供 API Key，确保安全性。

## 使用方法

### 方法 1: 在当前终端安全读取

```bash
read -s -p "ModelScope API Key: " MODELSCOPE_API_KEY
echo
export MODELSCOPE_API_KEY
node test-modelscope-api.js
unset MODELSCOPE_API_KEY
```

输入内容不会显示在终端，也不会作为命令参数写入 shell 历史。

### 方法 2: 使用已配置的环境变量

```bash
node test-modelscope-api.js
```

## 获取 API Key

1. 访问 [ModelScope 魔塔社区](https://www.modelscope.cn/)
2. 登录后进入个人中心
3. 进入 [Access Token 管理](https://www.modelscope.cn/my/myaccesstoken)
4. 创建新的 Token
5. 复制 Token，并只保存到受保护的 Secret 或当前终端环境变量中

## 测试输出

成功运行后，你会看到：

```
开始测试 ModelScope API；提交样本: 5
模型目录: 35；候选: 3；跳过: 0；动态补充: 0
尝试使用模型: Qwen/Qwen3.5-397B-A17B
API 调用成功；模型: Qwen/Qwen3.5-397B-A17B
生成的发布摘要:
### ...
Token: 输入=...；输出=...；总计=...
```

该脚本复用正式发布日志的目录发现、候选过滤、提示词、输出校验和模型降级逻辑，用于验证凭据、网络和当前可用模型。可以临时设置 `MODELSCOPE_MODELS` 检查显式候选；不设置时使用默认候选与受控动态补位。

正式发布日志工作流采用以下语义：

- 每次运行只请求一次 `/v1/models`，初稿和审稿复用选择结果。
- 默认候选与目录取交集后不足时，可受控补入兼容的 Qwen3.x 文本模型。
- 显式 `MODELSCOPE_MODELS` 只过滤配置项，不补入其他模型。
- 目录请求失败时回退静态候选链；目录成功但无交集时不发送 Chat 请求。
- 模型出现在目录中不代表当前账户有额度、权限或可用提供方。

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
2. ✅ **避免命令历史** - 使用静默输入或 GitHub Actions Secret，不把密钥写进命令参数
3. ✅ **定期轮换** - 定期更换 API Key
4. ✅ **最小权限** - 只授予必要的权限
5. ✅ **监控使用** - 定期检查 API 使用情况

## 相关文档

- [ModelScope API 配置指南](MODELSCOPE_API_GUIDE.md)
- [Release 工作流优化指南](RELEASE_WORKFLOW_GUIDE.md)
