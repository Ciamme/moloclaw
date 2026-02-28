# MoloClaw 快速启动指南

## 前置要求

- Node.js 20+
- Docker 或 Apple Container (macOS)
- iFlow CLI (需要单独安装)
- WhatsApp (用于消息接收)

## 5 分钟快速启动

### 1. 安装依赖

```bash
cd /Users/willsgeo/Projects/moloclaw
npm install
```

### 2. 编译项目

```bash
npm run build
cd container/agent-runner && npm run build && cd ../..
```

### 3. 配置环境

```bash
cp .env.example .env
# 编辑 .env 文件，添加必要的配置
```

### 4. 首次运行（设置 WhatsApp）

```bash
npm run auth
```

扫描二维码连接 WhatsApp。

### 5. 启动 MoloClaw

```bash
npm start
```

## 测试 iFlow 集成

运行测试脚本验证 iFlow 工具是否正常工作：

```bash
node test-iflow.js
```

## 使用方法

### 发送消息给助手

在 WhatsApp 中，使用触发词（默认为 `@Andy`）发送消息：

```
@Andy 列出当前目录的文件
```

### 调度任务

```
@Andy 每天早上 9 点给我发送天气报告
```

### 管理群组

在主频道（self-chat）中：

```
@Andy 列出所有群组
@Andy 加入 "家庭聊天" 群组
```

## 常见问题

### Q: 如何更改触发词？

A: 编辑 `.env` 文件中的 `ASSISTANT_NAME` 变量。

### Q: 如何添加新的通信渠道？

A: MoloClaw 目前只支持 WhatsApp。可以通过修改 `src/channels/` 添加其他渠道。

### Q: iFlow 工具不工作怎么办？

A: 检查：
1. iFlow 桥接服务是否启动（查看日志）
2. IPC 目录权限是否正确
3. 运行 `node test-iflow.js` 测试工具

### Q: 如何查看日志？

A: 日志存储在 `groups/{group}/logs/` 目录中。

## 下一步

- 阅读 [iFlow 集成文档](IFLOW_INTEGRATION.md) 了解详细架构
- 查看 [README_zh.md](../README_zh.md) 了解完整功能
- 加入 [Discord](https://discord.gg/VDdww8qS42) 社区获取支持

## 停止服务

```bash
# 按 Ctrl+C 停止服务

# 或使用系统服务管理
# macOS:
launchctl unload ~/Library/LaunchAgents/com.moloclaw.plist

# Linux:
systemctl --user stop moloclaw
```

## 故障排除

### 容器构建失败

```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建
cd container && docker build -t moloclaw-agent .
```

### WhatsApp 连接失败

```bash
# 删除认证文件重新连接
rm -rf data/sessions/main/.auth
npm run auth
```

### 数据库错误

```bash
# 删除数据库重新初始化
rm -f data/metadata.db
npm start
```

## 获取帮助

- GitHub Issues: https://github.com/Ciamme/moloclaw/issues
- Discord: https://discord.gg/VDdww8qS42
- 文档: https://github.com/Ciamme/moloclaw/docs