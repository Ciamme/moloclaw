/**
 * MoloClaw 交互式 CLI
 * 直接通过终端与 MoloClaw 交互，不需要 WhatsApp
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const IPC_DIR = path.join(DATA_DIR, 'sessions', 'main', 'ipc', 'messages');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 确保 IPC 目录存在
fs.mkdirSync(IPC_DIR, { recursive: true });

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           MoloClaw 交互式 CLI - 直接与机器人对话              ║');
console.log('║                                                              ║');
console.log('║  输入消息后按回车发送，输入 "exit" 或 "quit" 退出            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

function sendMessage(text) {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const messageFile = path.join(IPC_DIR, `${messageId}.json`);

  const message = {
    type: 'message',
    chatJid: 'main@s.whatsapp.net',
    text: text,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(messageFile, JSON.stringify(message, null, 2));
  console.log(`\n[已发送] ${text}`);
  console.log('[等待响应...]\n');
}

function askQuestion() {
  rl.question('你: ', (answer) => {
    const trimmedAnswer = answer.trim();

    if (trimmedAnswer === 'exit' || trimmedAnswer === 'quit') {
      console.log('\n再见！');
      rl.close();
      process.exit(0);
    }

    if (trimmedAnswer) {
      sendMessage(trimmedAnswer);
    }

    askQuestion();
  });
}

// 开始交互循环
askQuestion();

// 处理 Ctrl+C
rl.on('SIGINT', () => {
  console.log('\n\n再见！');
  rl.close();
  process.exit(0);
});