/**
 * 注册主群组脚本
 * 运行此脚本可以将你的 WhatsApp 自聊注册为主群组
 */

import { initDatabase, setRegisteredGroup } from './dist/db.js';
import { resolveGroupFolderPath } from './dist/group-folder.js';
import fs from 'fs';
import path from 'path';

async function registerMainGroup() {
  console.log('初始化数据库...');
  initDatabase();

  // 你的 WhatsApp 号码（需要从日志中找到或手动输入）
  // 格式：数字@s.whatsapp.net
  const myJid = process.argv[2];

  if (!myJid) {
    console.error('\n使用方法: node register-main.js <你的号码@s.whatsapp.net>');
    console.log('\n如何找到你的号码：');
    console.log('1. 在 MoloClaw 运行时，给任意 WhatsApp 联系人发送消息');
    console.log('2. 查看 groups/*/logs/ 目录中的日志文件');
    console.log('3. 搜索类似 "120363..." 的 JID');
    console.log('4. 找到你自己的号码（通常是数字@s.whatsapp.net）\n');
    process.exit(1);
  }

  const mainGroup = {
    name: 'Main',
    folder: 'main',
    trigger: '@Andy',
    added_at: new Date().toISOString(),
    requiresTrigger: false, // 主群组不需要触发词
  };

  console.log(`\n注册主群组: ${myJid}`);
  console.log('群组信息:', mainGroup);

  // 注册群组
  setRegisteredGroup(myJid, mainGroup);

  // 创建群组目录
  const groupDir = resolveGroupFolderPath('main');
  fs.mkdirSync(path.join(groupDir, 'logs'), { recursive: true });

  // 创建 CLAUDE.md
  const claudeMdPath = path.join(groupDir, 'CLAUDE.md');
  if (!fs.existsSync(claudeMdPath)) {
    fs.writeFileSync(claudeMdPath, '# MoloClaw 主群组\n\n这是 MoloClaw 的主控制频道。\n');
  }

  console.log('\n✅ 主群组注册成功！');
  console.log(`\n现在你可以给 ${myJid} 发送消息了`);
  console.log('使用触发词: @Andy');
  console.log('\n示例消息:');
  console.log('  @Andy 你好');
  console.log('  @Andy 列出当前目录的文件');
}

registerMainGroup().catch(err => {
  console.error('注册失败:', err);
  process.exit(1);
});