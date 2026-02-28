/**
 * MoloClaw Agent Runner (iFlow-powered)
 * Runs inside a container, receives config via stdin, outputs result to stdout
 * 
 * This version uses iFlow tool calls via IPC to the host system.
 *
 * Input protocol:
 *   Stdin: Full ContainerInput JSON (read until EOF)
 *   IPC:   Follow-up messages written as JSON files to /workspace/ipc/input/
 *
 * Stdout protocol:
 *   Each result is wrapped in OUTPUT_START_MARKER / OUTPUT_END_MARKER pairs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { IpcBridge } from './ipc-mcp-stdio.js';

interface ContainerInput {
  prompt: string;
  sessionId?: string;
  groupFolder: string;
  chatJid: string;
  isMain: boolean;
  isScheduledTask?: boolean;
  assistantName?: string;
  secrets?: Record<string, string>;
}

interface ContainerOutput {
  status: 'success' | 'error';
  result: string | null;
  newSessionId?: string;
  error?: string;
}

interface IToolCall {
  name: string;
  input: Record<string, unknown>;
}

interface IToolResult {
  result?: unknown;
  error?: string;
}

const IPC_INPUT_DIR = '/workspace/ipc/input';
const IPC_INPUT_CLOSE_SENTINEL = path.join(IPC_INPUT_DIR, '_close');
const IPC_OUTPUT_DIR = '/workspace/ipc/output';
const IPC_POLL_MS = 500;
const OUTPUT_START_MARKER = '---NANOCLAW_OUTPUT_START---';
const OUTPUT_END_MARKER = '---NANOCLAW_OUTPUT_END---';
const IFLOW_REQUEST_DIR = '/workspace/ipc/iflow-requests';
const IFLOW_RESPONSE_DIR = '/workspace/ipc/iflow-responses';

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function writeOutput(output: ContainerOutput): void {
  console.log(OUTPUT_START_MARKER);
  console.log(JSON.stringify(output));
  console.log(OUTPUT_END_MARKER);
}

function log(message: string): void {
  console.error(`[moloclaw-agent-runner] ${message}`);
}

/**
 * Call iFlow tool via IPC
 * This sends a request to the host system and waits for the response
 */
async function callIFlowTool(toolName: string, input: Record<string, unknown>): Promise<IToolResult> {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const requestFile = path.join(IFLOW_REQUEST_DIR, `${requestId}.json`);
  const responseFile = path.join(IFLOW_RESPONSE_DIR, `${requestId}.json`);

  // Write request
  fs.mkdirSync(IFLOW_REQUEST_DIR, { recursive: true });
  fs.mkdirSync(IFLOW_RESPONSE_DIR, { recursive: true });
  
  const request = {
    tool: toolName,
    input,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(requestFile, JSON.stringify(request, null, 2));
  log(`Sent iFlow request: ${toolName} (id: ${requestId})`);

  // Wait for response
  const maxWait = 30000; // 30 seconds timeout
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    if (fs.existsSync(responseFile)) {
      try {
        const response = JSON.parse(fs.readFileSync(responseFile, 'utf-8'));
        // Clean up
        fs.unlinkSync(requestFile);
        fs.unlinkSync(responseFile);
        return response;
      } catch (err) {
        return { error: `Failed to parse response: ${err}` };
      }
    }
    await new Promise(resolve => setTimeout(resolve, IPC_POLL_MS));
  }

  // Timeout
  try { fs.unlinkSync(requestFile); } catch {}
  return { error: `Timeout waiting for iFlow response: ${toolName}` };
}

/**
 * Process a prompt using iFlow
 * This is a simplified implementation that simulates the agent loop
 */
async function processPromptWithIFlow(prompt: string, containerInput: ContainerInput): Promise<string> {
  log(`Processing prompt with iFlow (${prompt.length} chars)`);

  // Load CLAUDE.md context if it exists
  const claudeMdPath = '/workspace/group/CLAUDE.md';
  let context = '';
  if (fs.existsSync(claudeMdPath)) {
    context = fs.readFileSync(claudeMdPath, 'utf-8') + '\n\n';
  }

  // Load global CLAUDE.md if not main group
  if (!containerInput.isMain) {
    const globalClaudeMdPath = '/workspace/global/CLAUDE.md';
    if (fs.existsSync(globalClaudeMdPath)) {
      context += fs.readFileSync(globalClaudeMdPath, 'utf-8') + '\n\n';
    }
  }

  // For now, we'll use a simple echo with context
  // In a real implementation, this would:
  // 1. Send the prompt to iFlow via IPC
  // 2. Wait for iFlow to process it
  // 3. Receive tool calls from iFlow
  // 4. Execute tool calls via callIFlowTool
  // 5. Send results back to iFlow
  // 6. Repeat until iFlow is done
  // 7. Return the final response

  const result = `[MoloClaw Agent Response]\n\nContext loaded: ${context ? 'Yes' : 'No'}\n\nYour prompt: ${prompt}\n\nNote: Full iFlow integration requires the host system to:\n1. Mount /workspace/ipc/iflow-requests and /workspace/ipc/iflow-responses\n2. Run an IPC bridge that forwards requests to iFlow\n3. Send responses back to the container\n\nFor now, this is a placeholder response.`;
  
  return result;
}

/**
 * Drain all pending IPC input messages.
 */
function drainIpcInput(): string[] {
  try {
    fs.mkdirSync(IPC_INPUT_DIR, { recursive: true });
    const files = fs.readdirSync(IPC_INPUT_DIR)
      .filter(f => f.endsWith('.json'))
      .sort();

    const messages: string[] = [];
    for (const file of files) {
      const filePath = path.join(IPC_INPUT_DIR, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        fs.unlinkSync(filePath);
        if (data.type === 'message' && data.text) {
          messages.push(data.text);
        }
      } catch (err) {
        log(`Failed to process input file ${file}: ${err instanceof Error ? err.message : String(err)}`);
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }
    }
    return messages;
  } catch (err) {
    log(`IPC drain error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/**
 * Check for _close sentinel.
 */
function shouldClose(): boolean {
  if (fs.existsSync(IPC_INPUT_CLOSE_SENTINEL)) {
    try { fs.unlinkSync(IPC_INPUT_CLOSE_SENTINEL); } catch { /* ignore */ }
    return true;
  }
  return false;
}

/**
 * Wait for a new IPC message or _close sentinel.
 */
function waitForIpcMessage(): Promise<string | null> {
  return new Promise((resolve) => {
    const poll = () => {
      if (shouldClose()) {
        resolve(null);
        return;
      }
      const messages = drainIpcInput();
      if (messages.length > 0) {
        resolve(messages.join('\n'));
        return;
      }
      setTimeout(poll, IPC_POLL_MS);
    };
    poll();
  });
}

async function main(): Promise<void> {
  let containerInput: ContainerInput;

  try {
    const stdinData = await readStdin();
    containerInput = JSON.parse(stdinData);
    // Delete the temp file the entrypoint wrote — it contains secrets
    try { fs.unlinkSync('/tmp/input.json'); } catch { /* may not exist */ }
    log(`Received input for group: ${containerInput.groupFolder}`);
  } catch (err) {
    writeOutput({
      status: 'error',
      result: null,
      error: `Failed to parse input: ${err instanceof Error ? err.message : String(err)}`
    });
    process.exit(1);
  }

  let sessionId = containerInput.sessionId || `session-${Date.now()}`;
  fs.mkdirSync(IPC_INPUT_DIR, { recursive: true });

  // Clean up stale _close sentinel from previous container runs
  try { fs.unlinkSync(IPC_INPUT_CLOSE_SENTINEL); } catch { /* ignore */ }

  // Build initial prompt (drain any pending IPC messages too)
  let prompt = containerInput.prompt;
  if (containerInput.isScheduledTask) {
    prompt = `[SCHEDULED TASK - The following message was sent automatically and is not coming directly from the user or group.]\n\n${prompt}`;
  }
  const pending = drainIpcInput();
  if (pending.length > 0) {
    log(`Draining ${pending.length} pending IPC messages into initial prompt`);
    prompt += '\n' + pending.join('\n');
  }

  try {
    // Process the initial prompt
    log(`Processing initial prompt (${prompt.length} chars)...`);
    const result = await processPromptWithIFlow(prompt, containerInput);
    
    writeOutput({
      status: 'success',
      result: result,
      newSessionId: sessionId
    });

    // Query loop: wait for IPC message → process → repeat
    while (true) {
      log('Waiting for next IPC message...');
      
      const nextMessage = await waitForIpcMessage();
      if (nextMessage === null) {
        log('Close sentinel received, exiting');
        break;
      }

      log(`Got new message (${nextMessage.length} chars), processing...`);
      const nextResult = await processPromptWithIFlow(nextMessage, containerInput);
      
      writeOutput({
        status: 'success',
        result: nextResult,
        newSessionId: sessionId
      });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`Agent error: ${errorMessage}`);
    writeOutput({
      status: 'error',
      result: null,
      newSessionId: sessionId,
      error: errorMessage
    });
    process.exit(1);
  }
}

main();