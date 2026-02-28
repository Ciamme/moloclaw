# 如何给 MoloClaw 发送消息

## 步骤 1: 找到你的 WhatsApp 号码 (JID)

运行查找脚本：

```bash
node find-my-jid.js
```

这会列出所有 WhatsApp 联系人。找到你自己的号码，格式类似：`861234567890@s.whatsapp.net`

## 步骤 2: 注册主群组

使用你的 JID 注册主群组：

```bash
node register-main.js <你的号码@s.whatsapp.net>
```

例如：
```bash
node register-main.js 861234567890@s.whatsapp.net
```

## 步骤 3: 在 WhatsApp 上发送消息

1. 在 WhatsApp 中找到自己的聊天（自聊）
2. 使用触发词发送消息：

```
@Andy 你好
```

或者：

```
@Andy 列出当前目录的文件
```

## 常见问题

### Q: 如何找到自己的 WhatsApp 聊天？

在 WhatsApp 中：
- 搜索自己的手机号码
- 或者创建新聊天，输入自己的号码

### Q: 触发词是什么？

默认触发词是 `@Andy`。你可以在配置中修改它。

### Q: 为什么没有回复？

检查：
1. MoloClaw 是否正在运行
2. 主群组是否已注册
3. 是否使用了正确的触发词
4. 查看 `groups/main/logs/` 目录中的日志

### Q: 如何查看日志？

```bash
ls -la groups/main/logs/
cat groups/main/logs/*.log
```

## 示例消息

测试基本功能：

```
@Andy 你好
@Andy 当前时间是什么？
@Andy 列出 groups 目录的文件
```

测试文件操作：

```
@Andy 创建一个测试文件 test.txt，内容为 "Hello MoloClaw"
@Andy 读取 test.txt 文件
```

测试 shell 命令：

```
@Andy 运行命令 echo "Hello World"
@Andy 列出当前目录的所有文件
```

## 下一步

- 阅读完整的 iFlow 集成文档：`docs/IFLOW_INTEGRATION.md`
- 查看快速启动指南：`docs/QUICKSTART.md`
- 了解如何添加更多功能