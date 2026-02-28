<p align="center">
  <img src="assets/nanoclaw-logo.png" alt="MoloClaw" width="400">
</p>

<p align="center">
  MoloClaw - Your personal AI assistant powered by iFlow, running securely in containers. Lightweight, easy to understand, and fully customizable.
</p>

<p align="center">
  <a href="README_zh.md">中文</a>&nbsp; • &nbsp;
  <a href="https://discord.gg/VDdww8qS42"><img src="https://img.shields.io/discord/1470188214710046894?label=Discord&logo=discord&v=2" alt="Discord" valign="middle"></a>
</p>

**MoloClaw** is an iFlow-powered fork of NanoClaw. It replaces Claude Code with iFlow, giving you the same containerized AI assistant experience with full control over your AI model and toolchain.

## Why MoloClaw?

[NanoClaw](https://github.com/qwibitai/nanoclaw) is an impressive project, but I wanted to use my own AI infrastructure instead of Claude Code. MoloClaw provides the same core functionality but with iFlow integration, allowing you to:

- Use your own AI models
- Have complete control over the toolchain
- Customize every aspect of the system
- Maintain the same security and isolation benefits

MoloClaw keeps the codebase small enough to understand: one process and a handful of files. Agents run in their own Linux containers with filesystem isolation, not merely behind permission checks.

## Quick Start

```bash
git clone https://github.com/Ciamme/moloclaw.git
cd moloclaw
npm install
npm run build
npm start
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for detailed setup instructions.

## Philosophy

**Small enough to understand.** One process, a few source files and no microservices. The entire codebase can be understood in under an hour.

**Secure by isolation.** Agents run in Linux containers (Apple Container on macOS, or Docker) and they can only see what's explicitly mounted. Bash access is safe because commands run inside the container, not on your host.

**Built for the individual user.** MoloClaw isn't a monolithic framework; it's software that fits each user's exact needs. Fork it and modify it to match your needs.

**iFlow-powered.** Instead of Claude Code, MoloClaw uses iFlow for all AI operations. This gives you complete control over:
- Which AI models to use
- How tools are implemented
- The agent loop behavior
- Integration with your existing infrastructure

**Customization = code changes.** No configuration sprawl. Want different behavior? Modify the code. The codebase is small enough that it's safe to make changes.

## What It Supports

- **Messenger I/O** - Message MoloClaw from your phone. Currently supports WhatsApp.
- **Isolated group context** - Each group has its own `CLAUDE.md` memory, isolated filesystem, and runs in its own container sandbox.
- **Main channel** - Your private channel (self-chat) for admin control.
- **Scheduled tasks** - Recurring jobs that run agents and can message you back.
- **Web access** - Search and fetch content from the Web.
- **Container isolation** - Agents are sandboxed in Apple Container (macOS) or Docker (macOS/Linux).
- **iFlow tools** - Full access to iFlow's toolset including file operations, shell commands, web access, and more.
- **Optional integrations** - Extensible architecture for adding new capabilities.

## Usage

Talk to your assistant with the trigger word (default: `@Andy`):

```
@Andy list all files in the current directory
@Andy create a summary of the sales report
@Andy every morning at 9am, send me a weather report
```

From the main channel (your self-chat), you can manage groups and tasks:
```
@Andy list all scheduled tasks across groups
@Andy pause the morning briefing task
@Andy join the Family Chat group
```

## iFlow Integration

MoloClaw uses iFlow for all AI operations. The architecture:

```
WhatsApp (baileys) --> SQLite --> Polling loop --> Container --> iFlow Bridge --> iFlow Tools --> Response
```

Key components:
- `src/index.ts` - Main orchestrator
- `src/iflow-bridge.ts` - Bridges container requests to iFlow
- `src/iflow-tools.ts` - iFlow tool implementations
- `src/container-runner.ts` - Container management
- `container/agent-runner/` - Container-side agent

See [docs/IFLOW_INTEGRATION.md](docs/IFLOW_INTEGRATION.md) for detailed architecture documentation.

## Requirements

- macOS or Linux
- Node.js 20+
- iFlow CLI
- [Apple Container](https://github.com/apple/container) (macOS) or [Docker](https://docker.com/products/docker-desktop) (macOS/Linux)

## Architecture

Single Node.js process with iFlow bridge service. Agents execute in isolated Linux containers with filesystem isolation. Communication between container and host happens via IPC (file system).

Key files:
- `src/index.ts` - Orchestrator: state, message loop, agent invocation
- `src/iflow-bridge.ts` - iFlow bridge service
- `src/iflow-tools.ts` - iFlow tool implementations
- `src/channels/whatsapp.ts` - WhatsApp connection, auth, send/receive
- `src/ipc.ts` - IPC watcher and task processing
- `src/router.ts` - Message formatting and outbound routing
- `src/group-queue.ts` - Per-group queue with global concurrency limit
- `src/container-runner.ts` - Spawns streaming agent containers
- `src/task-scheduler.ts` - Runs scheduled tasks
- `src/db.ts` - SQLite operations (messages, groups, sessions, state)
- `groups/*/CLAUDE.md` - Per-group memory
- `container/agent-runner/src/index.ts` - Container-side agent runner

## FAQ

**Why use iFlow instead of Claude Code?**

iFlow gives you complete control over:
- Which AI models to use
- How tools are implemented
- The agent loop behavior
- Integration with your existing infrastructure

**How does the container-host communication work?**

Containers communicate with the host via IPC files in `iflow-requests/` and `iflow-responses/` directories. The iFlow bridge service monitors these directories and forwards requests to iFlow tools.

**Can I add custom iFlow tools?**

Yes! Add your tool to `src/iflow-tools.ts`, register it in `ToolRegistry`, and add the mapping in `src/iflow-bridge.ts`. See [docs/IFLOW_INTEGRATION.md](docs/IFLOW_INTEGRATION.md) for details.

**Is this secure?**

Agents run in containers with filesystem isolation. They can only access explicitly mounted directories. The iFlow bridge service only monitors designated IPC directories. See [docs/SECURITY.md](docs/SECURITY.md) for the full security model.

**Can I run this on Linux?**

Yes. Docker is the default runtime and works on both macOS and Linux.

**How do I debug issues?**

Check the logs in `groups/{group}/logs/` directory. You can also run `node test-iflow.js` to test iFlow tools directly.

**What's the difference between MoloClaw and NanoClaw?**

MoloClaw is an iFlow-powered fork of NanoClaw. The main differences:
- Uses iFlow instead of Claude Code
- No Claude SDK dependencies
- Custom iFlow bridge for container-host communication
- Full control over AI models and tools

See [IFLOW_INTEGRATION.md](docs/IFLOW_INTEGRATION.md) for a detailed comparison.

## Community

Questions? Ideas? [Join the Discord](https://discord.gg/VDdww8qS42).

## Documentation

- [Quick Start Guide](docs/QUICKSTART.md) - Get up and running in 5 minutes
- [iFlow Integration](docs/IFLOW_INTEGRATION.md) - Detailed architecture and implementation
- [Security Model](docs/SECURITY.md) - How MoloClaw keeps your data safe

## Contributing

MoloClaw welcomes contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**What we're looking for:**

- Bug fixes
- Security improvements
- Performance optimizations
- Documentation improvements
- New communication channels (Telegram, Discord, etc.)

## License

MIT

## Acknowledgments

MoloClaw is based on [NanoClaw](https://github.com/qwibitai/nanoclaw), which is in turn inspired by [OpenClaw](https://github.com/openclaw/openclaw).
