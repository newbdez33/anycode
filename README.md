# AnyCode

Multi-terminal Claude Code orchestration platform with local Docker sandboxes.

## Overview

AnyCode is a desktop application that allows you to manage multiple Claude Code instances running in isolated Docker containers. Import GitHub projects, work on different branches in parallel, and create PRs - all while keeping your Claude credentials secure on your local machine.

## Features

- **Interactive Terminals** - Real-time streaming terminals powered by xterm.js
- **One-Click GitHub Import** - Clone repositories and start working instantly
- **Multi-Sandbox Parallel Work** - Run multiple Claude Code instances on different branches
- **Automated PR Creation** - Review changes and create pull requests seamlessly
- **Local Credential Security** - Credentials never leave your machine (reads from Claude Code CLI)
- **Resource Monitoring** - Track CPU/memory usage across sandboxes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AnyCode Desktop App                          │
│                                                                 │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │
│  │    Tauri      │    │   Node.js     │    │    React      │   │
│  │    Shell      │───>│   Sidecar     │<───│   Frontend    │   │
│  │   (Rust)      │    │  (Fastify)    │    │  (xterm.js)   │   │
│  └───────────────┘    └───────┬───────┘    └───────────────┘   │
│                               │                                 │
│         ┌─────────────────────┼─────────────────────┐          │
│         │                     │                     │          │
│         ▼                     ▼                     ▼          │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────┐    │
│  │   keytar    │    │    dockerode    │    │  simple-git │    │
│  │  (Keychain) │    │   (Containers)  │    │    (Git)    │    │
│  └─────────────┘    └─────────────────┘    └─────────────┘    │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   Docker Sandboxes    │
                    │  ┌─────┐ ┌─────┐     │
                    │  │ CC  │ │ CC  │ ... │
                    │  └─────┘ └─────┘     │
                    └───────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Shell | Tauri 2.0 (Rust - minimal) |
| Backend | Node.js + Fastify + WebSocket |
| Frontend | React + TypeScript + Zustand |
| Terminal | xterm.js + node-pty |
| Containers | Docker + dockerode |
| Credentials | keytar (system keychain) |
| Git | simple-git |
| Database | better-sqlite3 |

## Prerequisites

- **Node.js** 20+
- **Rust** (for Tauri compilation)
- **Docker Desktop** or OrbStack
- **Claude Code CLI** (logged in)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/newbdez33/anycode.git
cd anycode

# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build
```

## Documentation

| Document | Description |
|----------|-------------|
| [DESIGN.md](docs/DESIGN.md) | System architecture and technical design |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Development guide and setup instructions |
| [ROADMAP.md](docs/ROADMAP.md) | Detailed task breakdown by phases |
| [TESTING.md](docs/TESTING.md) | TDD-based testing strategy |

## Development Phases

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Core Foundation (Credentials + Docker) | 🚧 Planning |
| Phase 2 | Terminal Experience (PTY + xterm.js) | ⏳ Pending |
| Phase 3 | Project Management (Git + GitHub) | ⏳ Pending |
| Phase 4 | Multi-Sandbox Parallel Execution | ⏳ Pending |
| Phase 5 | Advanced Features (Workflows) | ⏳ Pending |
| Phase 6 | Release & Distribution | ⏳ Pending |

## Project Structure

```
anycode/
├── apps/
│   └── desktop/
│       ├── src/                 # React frontend
│       ├── sidecar/             # Node.js backend
│       │   └── src/
│       │       ├── services/    # Business logic
│       │       └── routes/      # API endpoints
│       └── src-tauri/           # Tauri shell (minimal Rust)
├── packages/
│   ├── ui/                      # Shared UI components
│   ├── shared/                  # Shared utilities
│   └── sandbox-image/           # Docker image for sandboxes
└── docs/                        # Documentation
```

## How It Works

1. **Launch AnyCode** - The Tauri shell starts the Node.js sidecar
2. **Detect Credentials** - Reads Claude Code OAuth tokens from system keychain
3. **Import Project** - Clone a GitHub repository to local storage
4. **Create Sandbox** - Spin up a Docker container with Claude Code
5. **Inject Credentials** - Pass tokens as environment variables (memory only)
6. **Interactive Terminal** - Full PTY access via WebSocket
7. **Create PR** - Review changes and push to GitHub

## Security

- Credentials are read from the local system keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Tokens are injected into containers as environment variables, never persisted to disk
- Containers are isolated with resource limits and security options
- No credentials are ever sent to external servers

## Contributing

Contributions are welcome! Please read the [development guide](docs/DEVELOPMENT.md) first.

## License

MIT

---

**Note**: This project is currently in the planning/documentation phase. Code implementation will follow the roadmap defined in the documentation.
