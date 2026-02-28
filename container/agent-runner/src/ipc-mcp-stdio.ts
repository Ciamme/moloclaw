/**
 * IPC Bridge for MoloClaw
 * Provides a simple interface for the container to communicate with the host
 * This is a simplified version that doesn't use MCP SDK
 */

import fs from 'fs';
import path from 'path';

const IPC_DIR = '/workspace/ipc';
const MESSAGES_DIR = path.join(IPC_DIR, 'messages');
const TASKS_DIR = path.join(IPC_DIR, 'tasks');

// Context from environment variables (set by the agent runner)
const chatJid = process.env.NANOCLAW_CHAT_JID!;
const groupFolder = process.env.NANOCLAW_GROUP_FOLDER!;
const isMain = process.env.NANOCLAW_IS_MAIN === '1';

function writeIpcFile(dir: string, data: object): string {
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const filepath = path.join(dir, filename);

  // Atomic write: temp file then rename
  const tempPath = `${filepath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, filepath);

  return filename;
}

/**
 * Send a message to the user or group
 */
export function sendMessage(text: string, sender?: string): void {
  const data: Record<string, string | undefined> = {
    type: 'message',
    chatJid,
    text,
    sender: sender || undefined,
    groupFolder,
    timestamp: new Date().toISOString(),
  };

  writeIpcFile(MESSAGES_DIR, data);
}

/**
 * Schedule a task
 */
export function scheduleTask(
  prompt: string,
  scheduleType: 'cron' | 'interval' | 'once',
  scheduleValue: string,
  contextMode: 'group' | 'isolated' = 'group',
  targetGroupJid?: string
): void {
  const targetJid = isMain && targetGroupJid ? targetGroupJid : chatJid;

  const data = {
    type: 'schedule_task',
    prompt,
    schedule_type: scheduleType,
    schedule_value: scheduleValue,
    context_mode: contextMode,
    targetJid,
    createdBy: groupFolder,
    timestamp: new Date().toISOString(),
  };

  writeIpcFile(TASKS_DIR, data);
}

/**
 * List all scheduled tasks
 */
export function listTasks(): string {
  const tasksFile = path.join(IPC_DIR, 'current_tasks.json');

  try {
    if (!fs.existsSync(tasksFile)) {
      return 'No scheduled tasks found.';
    }

    const allTasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));

    const tasks = isMain
      ? allTasks
      : allTasks.filter((t: { groupFolder: string }) => t.groupFolder === groupFolder);

    if (tasks.length === 0) {
      return 'No scheduled tasks found.';
    }

    const formatted = tasks
      .map(
        (t: { id: string; prompt: string; schedule_type: string; schedule_value: string; status: string; next_run: string }) =>
          `- [${t.id}] ${t.prompt.slice(0, 50)}... (${t.schedule_type}: ${t.schedule_value}) - ${t.status}, next: ${t.next_run || 'N/A'}`,
      )
      .join('\n');

    return `Scheduled tasks:\n${formatted}`;
  } catch (err) {
    return `Error reading tasks: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Pause a task
 */
export function pauseTask(taskId: string): void {
  const data = {
    type: 'pause_task',
    taskId,
    groupFolder,
    isMain,
    timestamp: new Date().toISOString(),
  };

  writeIpcFile(TASKS_DIR, data);
}

/**
 * Resume a task
 */
export function resumeTask(taskId: string): void {
  const data = {
    type: 'resume_task',
    taskId,
    groupFolder,
    isMain,
    timestamp: new Date().toISOString(),
  };

  writeIpcFile(TASKS_DIR, data);
}

/**
 * Cancel a task
 */
export function cancelTask(taskId: string): void {
  const data = {
    type: 'cancel_task',
    taskId,
    groupFolder,
    isMain,
    timestamp: new Date().toISOString(),
  };

  writeIpcFile(TASKS_DIR, data);
}

/**
 * Register a new group (main group only)
 */
export function registerGroup(jid: string, name: string, folder: string, trigger: string): void {
  if (!isMain) {
    throw new Error('Only the main group can register new groups.');
  }

  const data = {
    type: 'register_group',
    jid,
    name,
    folder,
    trigger,
    timestamp: new Date().toISOString(),
  };

  writeIpcFile(TASKS_DIR, data);
}

// Export all functions for use in the agent runner
export const IpcBridge = {
  sendMessage,
  scheduleTask,
  listTasks,
  pauseTask,
  resumeTask,
  cancelTask,
  registerGroup,
};