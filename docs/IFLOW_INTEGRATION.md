# MoloClaw iFlow 集成文档

## 概述

MoloClaw 是 NanoClaw 的 iFlow 版本，将 Claude Code 替换为 iFlow，提供相同的容器化 AI 助手体验。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                        MoloClaw 主进程                        │
│  - WhatsApp 连接                                             │
│  - 消息路由                                                  │
│  - 任务调度                                                  │
│  - iFlow 桥接服务 ←─ 新增                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ IPC (文件系统)
                     │
        ┌────────────▼────────────┐
        │   Docker/Apple Container│
        │                         │
        │  ┌──────────────────┐  │
        │  │ Agent Runner     │  │
        │  │ (index.ts)       │  │
        │  └────────┬─────────┘  │
        │           │             │
        │           │ IPC 请求    │
        │           ▼             │
        │  ┌──────────────────┐  │
        │  │ iflow-requests/  │  │
        │  └──────────────────┘  │
        └─────────────────────────┘
                     │
                     │ IPC 响应
                     │
        ┌────────────▼────────────┐
        │   iFlow 桥接服务         │
        │   (iflow-bridge.ts)     │
        │   - 监控请求目录         │
        │   - 调用 iFlow 工具      │
        │   - 返回响应             │
        └────────┬─────────────────┘
                 │
                 │ 直接调用
                 │
        ┌────────▼─────────────────┐
        │   iFlow 工具模块          │
        │   (iflow-tools.ts)       │
        │   - read_file            │
        │   - write_file           │
        │   - run_shell_command    │
        │   - glob                 │
        │   - search_file_content  │
        │   - web_search           │
        │   - web_fetch            │
        │   - task                 │
        └──────────────────────────┘
```

## 核心组件

### 1. iFlow 桥接服务 (`src/iflow-bridge.ts`)

- 监控每个群组的 `iflow-requests/` 目录
- 解析容器发送的工具调用请求
- 调用 iFlow 工具执行操作
- 将结果写入 `iflow-responses/` 目录

### 2. iFlow 工具模块 (`src/iflow-tools.ts`)

提供以下工具的直接实现：

- `read_file` - 读取文件
- `write_file` - 写入文件
- `list_directory` - 列出目录
- `glob` - 按模式查找文件
- `search_file_content` - 搜索文件内容
- `run_shell_command` - 执行 shell 命令
- `web_search` - 网络搜索
- `web_fetch` - 获取网页内容
- `task` - 执行子任务

### 3. 容器 Agent Runner (`container/agent-runner/src/index.ts`)

- 接收来自主进程的提示词
- 通过 IPC 与宿主机通信
- 调用 iFlow 工具
- 返回结果

### 4. IPC Bridge (`container/agent-runner/src/ipc-mcp-stdio.ts`)

- 提供容器内的 IPC 工具
- 发送消息、调度任务等

## 工作流程

1. **用户发送消息** → WhatsApp
2. **主进程接收消息** → 格式化为提示词
3. **启动容器** → 挂载 IPC 目录
4. **Agent Runner 处理提示词**
5. **需要工具调用时** → 写入请求到 `iflow-requests/`
6. **iFlow 桥接服务** → 读取请求并执行工具
7. **返回结果** → 写入 `iflow-responses/`
8. **Agent Runner** → 读取结果并继续处理
9. **最终响应** → 通过 WhatsApp 发回用户

## 路径映射

容器内的路径会自动映射到宿主机路径：

| 容器路径 | 宿主机路径 |
|---------|-----------|
| `/workspace/group` | `/data/sessions/{group}/group` |
| `/workspace/global` | `/data/groups/global` |
| `/workspace/extra/*` | `/data/sessions/{group}/extra/*` |

## 工具映射

容器工具名称 → iFlow 工具名称：

| 容器 | iFlow |
|------|-------|
| Read | read_file |
| Write | write_file |
| Edit | replace |
| Bash | run_shell_command |
| Glob | glob |
| Grep | search_file_content |
| WebSearch | web_search |
| WebFetch | web_fetch |
| Task | task |
| ListDirectory | list_directory |

## 安装和运行

### 1. 克隆仓库

```bash
git clone https://github.com/Ciamme/moloclaw.git
cd moloclaw
```

### 2. 安装依赖

```bash
npm install
cd container/agent-runner && npm install && cd ../..
```

### 3. 编译

```bash
npm run build
cd container/agent-runner && npm run build && cd ../..
```

### 4. 配置

复制并编辑环境变量：

```bash
cp .env.example .env
# 编辑 .env 文件，配置 API 密钥等
```

### 5. 运行

```bash
npm start
```

## 测试

运行 iFlow 工具测试：

```bash
node test-iflow.js
```

## 注意事项

1. **容器隔离**：所有工具调用都通过 IPC 进行，保持容器隔离
2. **路径转换**：自动处理容器路径和宿主机路径的转换
3. **错误处理**：工具调用失败会返回错误信息给容器
4. **安全性**：iFlow 桥接服务只监控指定的 IPC 目录

## 扩展

要添加新的 iFlow 工具：

1. 在 `src/iflow-tools.ts` 中添加工具函数
2. 在 `ToolRegistry` 中注册
3. 在 `src/iflow-bridge.ts` 的 `TOOL_MAPPING` 中添加映射
4. 重新编译：`npm run build`

## 故障排除

### 容器无法连接 iFlow

检查：
- iFlow 桥接服务是否启动（查看日志）
- IPC 目录是否正确挂载
- 权限是否正确

### 工具调用超时

检查：
- 工具执行是否卡住
- 网络连接是否正常
- 文件路径是否正确

### 路径转换错误

检查：
- 路径映射配置是否正确
- 容器内的路径格式

## 与 NanoClaw 的差异

| 特性 | NanoClaw | MoloClaw |
|------|----------|----------|
| AI 引擎 | Claude Code | iFlow |
| 依赖 | @anthropic-ai/claude-agent-sdk | 自定义 iFlow 工具 |
| 容器内容 | Claude Code CLI | 简化的 Agent Runner |
| 工具调用 | SDK 内置 | IPC 桥接 |
| 扩展性 | 受限于 Claude Code | 完全自定义 |

## 许可证

MIT