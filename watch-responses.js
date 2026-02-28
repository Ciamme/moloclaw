/**
 * 监控 MoloClaw 的响应
 * 显示来自容器的所有输出
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const RESPONSES_DIR = path.join(DATA_DIR, 'sessions', 'main', 'ipc', 'iflow-responses');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           MoloClaw 响应监控 - 实时显示机器人回复             ║');
console.log('║                                                              ║');
console.log('║  按 Ctrl+C 停止监控                                         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// 确保目录存在
fs.mkdirSync(RESPONSES_DIR, { recursive: true });

let lastFileCount = 0;

function monitor() {
  try {
    const files = fs.readdirSync(RESPONSES_DIR);
    const currentFileCount = files.length;

    // 检查是否有新文件
    if (currentFileCount > lastFileCount) {
      const newFiles = files.slice(lastFileCount);

      for (const file of newFiles) {
        const filePath = path.join(RESPONSES_DIR, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);

          console.log('\n─────────────────────────────────────────────────────────');
          console.log(`[${new Date().toLocaleTimeString()}] Andy:`);

          if (data.result) {
            console.log(data.result);
          } else if (data.error) {
            console.log(`错误: ${data.error}`);
          }

          console.log('─────────────────────────────────────────────────────────\n');
        } catch (err) {
          console.log(`[无法解析响应文件: ${file}]`);
        }
      }

      lastFileCount = currentFileCount;
    }
  } catch (err) {
    // 忽略临时错误
  }

  setTimeout(monitor, 1000);
}

console.log('正在监控响应...\n');
monitor();

// 处理 Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n监控已停止');
  process.exit(0);
});