/**
 * iFlow Bridge for MoloClaw
 *
 * This service runs on the host machine and bridges between:
 * - Container requests (via IPC files)
 * - iFlow agent execution
 *
 * Architecture:
 * 1. Monitor iflow-requests/ directories for new requests
 * 2. Parse requests and invoke iFlow tools
 * 3. Write responses back to iflow-responses/
 */

import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { DATA_DIR } from './config.js';
import { logger } from './logger.js';

interface IFlowRequest {
  tool: string;
  input: Record<string, unknown>;
  timestamp: string;
}

interface IFlowResponse {
  result?: unknown;
  error?: string;
}

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

interface ToolResult {
  result?: unknown;
  error?: string;
}

// Tool name mapping: container tool names → iFlow tool names
const TOOL_MAPPING: Record<string, string> = {
  Read: 'read_file',
  Write: 'write_file',
  Edit: 'replace',
  Bash: 'run_shell_command',
  Glob: 'glob',
  Grep: 'search_file_content',
  WebSearch: 'web_search',
  WebFetch: 'web_fetch',
  Task: 'task',
  ListDirectory: 'list_directory',
};

// Tools that don't need file path conversion
const NO_PATH_CONVERSION = new Set([
  'run_shell_command',
  'web_search',
  'web_fetch',
  'task',
  'glob',
  'search_file_content',
  'list_directory',
]);

/**
 * Convert container paths to host paths
 * Containers see /workspace/group as their working directory
 * We need to map this to the actual host path
 */
function convertContainerToHostPath(
  containerPath: string,
  groupFolder: string,
): string {
  const workspaceRoot = path.join(DATA_DIR, 'sessions', groupFolder, 'group');

  // If it's an absolute path in /workspace
  if (containerPath.startsWith('/workspace/')) {
    const relative = containerPath.substring('/workspace/'.length);

    // /workspace/group → group folder
    if (relative.startsWith('group/')) {
      return path.join(workspaceRoot, relative.substring('group/'.length));
    }

    // /workspace/global → global folder
    if (relative.startsWith('global/')) {
      return path.join(
        DATA_DIR,
        'groups',
        'global',
        relative.substring('global/'.length),
      );
    }

    // /workspace/extra/* → extra mounts
    if (relative.startsWith('extra/')) {
      const extraName = relative.split('/')[1];
      return path.join(DATA_DIR, 'sessions', groupFolder, 'extra', extraName);
    }

    // Default: treat as relative to group folder
    return path.join(workspaceRoot, relative);
  }

  // Relative path: treat as relative to group folder
  return path.join(workspaceRoot, containerPath);
}

/**
 * Convert host paths to container paths (for responses)
 */
function convertHostToContainerPath(
  hostPath: string,
  groupFolder: string,
): string {
  const workspaceRoot = path.join(DATA_DIR, 'sessions', groupFolder, 'group');

  // Try to find if this path is under the workspace
  if (hostPath.startsWith(workspaceRoot)) {
    const relative = path.relative(workspaceRoot, hostPath);
    return `/workspace/group/${relative}`;
  }

  const globalRoot = path.join(DATA_DIR, 'groups', 'global');
  if (hostPath.startsWith(globalRoot)) {
    const relative = path.relative(globalRoot, hostPath);
    return `/workspace/global/${relative}`;
  }

  // Return as-is if we can't map it
  return hostPath;
}

/**
 * Process a single iFlow request
 */
async function processRequest(
  requestFile: string,
  responseFile: string,
  groupFolder: string,
): Promise<void> {
  try {
    // Read request
    const request: IFlowRequest = JSON.parse(
      fs.readFileSync(requestFile, 'utf-8'),
    );

    logger.debug(
      { tool: request.tool, groupFolder },
      'Processing iFlow request',
    );

    // Map tool name
    const iFlowTool = TOOL_MAPPING[request.tool] || request.tool;

    // Convert paths in input if needed
    const convertedInput: Record<string, unknown> = { ...request.input };

    if (!NO_PATH_CONVERSION.has(iFlowTool)) {
      // Convert common path parameters
      for (const key of ['file_path', 'absolute_path', 'path', 'dir_path']) {
        if (typeof convertedInput[key] === 'string') {
          convertedInput[key] = convertContainerToHostPath(
            convertedInput[key] as string,
            groupFolder,
          );
        }
      }
    }

    // Execute the tool via iFlow
    const result = await executeIFlowTool(iFlowTool, convertedInput);

    // Convert paths in result if needed
    const convertedResult = convertResultPaths(result, groupFolder);

    // Write response
    const response: IFlowResponse = {
      result: convertedResult.result,
      error: convertedResult.error,
    };

    fs.writeFileSync(responseFile, JSON.stringify(response, null, 2));

    logger.debug(
      { tool: request.tool, groupFolder, hasError: !!response.error },
      'iFlow request completed',
    );
  } catch (err) {
    logger.error(
      { requestFile, error: err },
      'Failed to process iFlow request',
    );

    const response: IFlowResponse = {
      error: err instanceof Error ? err.message : String(err),
    };

    fs.writeFileSync(responseFile, JSON.stringify(response, null, 2));
  }
}

/**
 * Convert paths in tool results
 */
function convertResultPaths(
  result: ToolResult,
  groupFolder: string,
): ToolResult {
  if (!result.result) return result;

  const converted = { ...result };

  // If result contains file paths, convert them back
  if (typeof result.result === 'string') {
    converted.result = convertHostToContainerPath(result.result, groupFolder);
  } else if (Array.isArray(result.result)) {
    converted.result = result.result.map((item) => {
      if (
        typeof item === 'string' &&
        (item.startsWith('/') || item.includes(path.sep))
      ) {
        return convertHostToContainerPath(item, groupFolder);
      }
      return item;
    });
  } else if (typeof result.result === 'object') {
    converted.result = JSON.parse(
      JSON.stringify(result.result, (key, value) => {
        if (
          typeof value === 'string' &&
          (value.startsWith('/') || value.includes(path.sep))
        ) {
          return convertHostToContainerPath(value, groupFolder);
        }
        return value;
      }),
    );
  }

  return converted;
}

/**
 * Execute iFlow tool via iFlow-tools module
 */
async function executeIFlowTool(
  toolName: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    const { executeTool } = await import('./iflow-tools.js');
    const result = await executeTool(toolName, input);

    return { result };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Watch a single group's iflow-requests directory
 */
function watchGroupRequests(groupFolder: string): void {
  const requestsDir = path.join(
    DATA_DIR,
    'sessions',
    groupFolder,
    'ipc',
    'iflow-requests',
  );
  const responsesDir = path.join(
    DATA_DIR,
    'sessions',
    groupFolder,
    'ipc',
    'iflow-responses',
  );

  fs.mkdirSync(requestsDir, { recursive: true });
  fs.mkdirSync(responsesDir, { recursive: true });

  // Use a polling approach (more reliable than fs.watch)
  let processedFiles = new Set<string>();

  const pollInterval = setInterval(() => {
    try {
      const files = fs
        .readdirSync(requestsDir)
        .filter((f) => f.endsWith('.json'));

      for (const file of files) {
        const requestFile = path.join(requestsDir, file);
        const responseFile = path.join(responsesDir, file);

        if (processedFiles.has(file) || fs.existsSync(responseFile)) {
          continue;
        }

        processedFiles.add(file);

        // Process asynchronously
        processRequest(requestFile, responseFile, groupFolder).catch((err) => {
          logger.error(
            { error: err, groupFolder },
            'Failed to process request',
          );
        });
      }

      // Clean up old files from the processed set
      processedFiles = new Set(
        [...processedFiles].filter((f) => files.includes(f)),
      );
    } catch (err) {
      logger.warn({ error: err, groupFolder }, 'Error polling requests');
    }
  }, 500); // Poll every 500ms

  logger.info({ groupFolder, requestsDir }, 'Watching for iFlow requests');
}

/**
 * Start the iFlow bridge service
 */
export function startIFlowBridge(): void {
  logger.info('Starting iFlow bridge service');

  // Watch all active group sessions
  const sessionsDir = path.join(DATA_DIR, 'sessions');

  const pollSessions = () => {
    try {
      const groups = fs
        .readdirSync(sessionsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      for (const groupFolder of groups) {
        const hasRequestsDir = fs.existsSync(
          path.join(sessionsDir, groupFolder, 'ipc', 'iflow-requests'),
        );

        if (hasRequestsDir) {
          watchGroupRequests(groupFolder);
        }
      }
    } catch (err) {
      logger.error({ error: err }, 'Failed to poll sessions');
    }
  };

  // Initial scan
  pollSessions();

  // Poll for new groups every 10 seconds
  setInterval(pollSessions, 10000);

  logger.info('iFlow bridge service started');
}

/**
 * Stop the iFlow bridge service
 */
export function stopIFlowBridge(): void {
  logger.info('Stopping iFlow bridge service');
  // In a real implementation, we would clean up timers and watchers
}
