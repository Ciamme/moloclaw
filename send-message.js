/**
 * 通过 IPC 文件系统直接向 MoloClaw 发送消息
 * 不需要 WhatsApp 连接
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const IPC_DIR = path.join(DATA_DIR, 'sessions', 'main', 'ipc', 'messages');

async function sendMessage(text) {
  // 确保 IPC 目录存在
  fs.mkdirSync(IPC_DIR, { recursive: true });

  // 创建消息文件
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const messageFile = path.join(IPC_DIR, `${messageId}.json`);

  const message = {
    type: 'message',
    chatJid: 'main@s.whatsapp.net', // 主群组的 JID
    text: text,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(messageFile, JSON.stringify(message, null, 2));
  console.log('✓ 消息已发送到 MoloClaw');
  console.log(`  内容: ${text}`);
  console.log(`  消息 ID: ${messageId}`);
  console.log(`\n响应将显示在 MoloClaw 的日志中`);
}

// 从命令行参数获取消息
const message = process.argv.slice(2).join(' ');

if (!message) {
  console.log('使用方法: node send-message.js "<你的消息>"');
  console.log('\n示例:');
  console.log('  node send-message.js "你好"');
  console.log('  node send-message.js "列出当前目录的文件"');
  console.log('  node send-message.js "帮我创建一个测试文件"');
  process.exit(1);
}

sendMessage(message).catch(err => {
  console.error('发送消息失败:', err);
  process.exit(1);
});