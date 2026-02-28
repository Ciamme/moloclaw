/**
 * 查找你的 WhatsApp JID
 */

import fs from 'fs';
import path from 'path';

const STORE_DIR = path.resolve(process.cwd(), 'store');
const GROUPS_DIR = path.resolve(process.cwd(), 'groups');

console.log('搜索 WhatsApp JID...\n');

// 查找数据库中的所有 JID
try {
  const dbPath = path.join(STORE_DIR, 'messages.db');
  if (!fs.existsSync(dbPath)) {
    console.log('❌ 数据库不存在，请先运行 MoloClaw');
    process.exit(1);
  }

  // 使用 better-sqlite3 读取数据库
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);

  const chats = db.prepare('SELECT jid, name, is_group FROM chats').all();
  
  console.log('找到的聊天：\n');
  
  // 只显示非群组的（个人）
  const personalChats = chats.filter((c: any) => !c.is_group);
  
  personalChats.forEach((chat: any) => {
    const displayName = chat.name || '未知';
    const jid = chat.jid;
    const isWhatsApp = jid.includes('@s.whatsapp.net');
    
    console.log(`📱 ${displayName}`);
    console.log(`   JID: ${jid}`);
    console.log(`   类型: ${isWhatsApp ? 'WhatsApp' : '其他'}`);
    console.log('');
  });
  
  console.log('\n提示：');
  console.log('1. 找到你自己的号码（通常是纯数字@s.whatsapp.net）');
  console.log('2. 运行: node register-main.js <你的号码@s.whatsapp.net>');
  console.log('3. 然后在 WhatsApp 上给自己发送消息\n');
  
  db.close();
} catch (err) {
  console.error('❌ 错误:', err.message);
  process.exit(1);
}