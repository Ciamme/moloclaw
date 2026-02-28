/**
 * iFlow Tools Interface
 * 
 * This module provides a direct interface to iFlow's tool set.
 * It allows the MoloClaw bridge to execute iFlow tools programmatically.
 * 
 * NOTE: This is a wrapper around iFlow's tool functions.
 * In a real deployment, iFlow should be imported or called via its API.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { logger } from './logger.js';

/**
 * Execute a bash command via iFlow
 */
export async function bash(command: string, cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', ['-c', command], {
      cwd: cwd || process.cwd(),
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Read a file via iFlow
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read file ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Write a file via iFlow
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to write file ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * List directory contents via iFlow
 */
export async function listDirectory(dirPath: string): Promise<string[]> {
  try {
    return fs.readdirSync(dirPath);
  } catch (err) {
    throw new Error(`Failed to list directory ${dirPath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Find files by pattern via iFlow
 */
export async function glob(pattern: string, basePath?: string): Promise<string[]> {
  try {
    const cwd = basePath || process.cwd();
    const result = await bash(`find ${cwd} -name "${pattern}" -type f 2>/dev/null`, cwd);
    return result.split('\n').filter(f => f).map(f => f.trim());
  } catch (err) {
    logger.warn({ pattern, error: err }, 'Glob search failed');
    return [];
  }
}

/**
 * Search file content via iFlow
 */
export async function grep(pattern: string, filePath: string): Promise<string[]> {
  try {
    const result = await bash(`grep -n "${pattern}" "${filePath}" 2>/dev/null || true`, path.dirname(filePath));
    return result.split('\n').filter(l => l);
  } catch (err) {
    logger.warn({ pattern, filePath, error: err }, 'Grep search failed');
    return [];
  }
}

/**
 * Web search via iFlow
 */
export async function webSearch(query: string): Promise<string> {
  try {
    // For now, return a placeholder
    // In a real implementation, this would call iFlow's web_search tool
    return `Web search results for: ${query}\n\n(Note: Actual web search requires iFlow integration)`;
  } catch (err) {
    throw new Error(`Web search failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Fetch web page via iFlow
 */
export async function webFetch(url: string): Promise<string> {
  try {
    // For now, use curl as a fallback
    const result = await bash(`curl -s "${url}"`, process.cwd());
    return result;
  } catch (err) {
    throw new Error(`Web fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Execute a subtask via iFlow
 */
export async function task(
  subagentType: string,
  prompt: string
): Promise<string> {
  try {
    // For now, return a placeholder
    // In a real implementation, this would spawn a subagent
    return `Subtask result from ${subagentType}\n\nPrompt: ${prompt}\n\n(Note: Actual subagent execution requires iFlow integration)`;
  } catch (err) {
    throw new Error(`Subtask execution failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Tool registry for dispatching tool calls
 */
export const ToolRegistry: Record<string, (...args: any[]) => Promise<any>> = {
  read_file: readFile,
  write_file: writeFile,
  list_directory: listDirectory,
  glob: glob,
  search_file_content: grep,
  run_shell_command: bash,
  web_search: webSearch,
  web_fetch: webFetch,
  task: task,
};

/**
 * Execute a tool by name with given arguments
 */
export async function executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const toolFn = ToolRegistry[toolName];
  
  if (!toolFn) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  // Convert args object to array of arguments based on tool signature
  const toolArgs = Object.values(args);
  
  return toolFn(...toolArgs);
}