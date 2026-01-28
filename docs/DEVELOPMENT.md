# AnyCode 开发计划与步骤

## 目录

1. [开发环境准备](#开发环境准备)
2. [项目初始化](#项目初始化)
3. [Phase 1: 核心基础](#phase-1-核心基础)
4. [Phase 2: 终端体验](#phase-2-终端体验)
5. [Phase 3: 项目管理](#phase-3-项目管理)
6. [Phase 4: 多 Sandbox](#phase-4-多-sandbox)
7. [Phase 5: 高级功能](#phase-5-高级功能)
8. [Phase 6: 发布分发](#phase-6-发布分发)

---

## 开发环境准备

### 必需工具

```bash
# 1. Node.js (v20+)
# 推荐使用 fnm 或 nvm
fnm install 20
fnm use 20

# 2. pnpm
npm install -g pnpm

# 3. Rust 工具链（仅用于 Tauri Shell）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update

# 4. Tauri CLI
cargo install tauri-cli

# 5. Docker Desktop 或 OrbStack (macOS 推荐 OrbStack)
# https://orbstack.dev/ 或 https://docker.com/products/docker-desktop

# 6. 其他工具
brew install git gh jq
```

### 验证环境

```bash
# 检查版本
node --version       # >= 20.0
pnpm --version       # >= 8.0
rustc --version      # >= 1.75 (仅用于 Tauri 编译)
cargo tauri --version # >= 2.0
docker --version     # >= 24.0

# 检查 Claude Code 登录状态
claude --version
security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null && echo "✓ Claude Code 已登录"
```

### 推荐 IDE 配置

```
VS Code 插件：
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Pretty TypeScript Errors
- ESLint
- Prettier
- Tauri (仅用于调试 Tauri Shell)
```

---

## 项目初始化

### Step 1: 创建项目结构

```bash
cd /Users/jacky/projects/dev/anycode

# 创建 pnpm workspace
pnpm init

# 创建目录结构
mkdir -p apps/desktop/{src,sidecar}
mkdir -p apps/desktop/src-tauri/src
mkdir -p packages/{ui,shared,sandbox-image}
mkdir -p scripts
```

### Step 2: 配置 Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'apps/desktop/sidecar'
  - 'packages/*'
```

```json
// package.json
{
  "name": "anycode",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @anycode/desktop dev",
    "dev:sidecar": "pnpm --filter @anycode/sidecar dev",
    "build": "pnpm --filter @anycode/desktop build",
    "lint": "turbo lint",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

### Step 3: 初始化 Tauri 项目

```bash
cd apps/desktop

# 初始化前端
pnpm init
pnpm add -D vite @vitejs/plugin-react typescript
pnpm add react react-dom
pnpm add -D @types/react @types/react-dom

# 初始化 Tauri (最小配置)
cargo tauri init
```

### Step 4: 配置 Tauri

```json
// apps/desktop/src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "AnyCode",
  "identifier": "cn.jacky.anycode",
  "version": "0.1.0",
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "AnyCode",
        "width": 1200,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    },
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "resources": ["sidecar/**/*"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

### Step 5: 初始化 Node.js Sidecar

```bash
cd apps/desktop/sidecar
pnpm init
```

```json
// apps/desktop/sidecar/package.json
{
  "name": "@anycode/sidecar",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "fastify": "^4.26.0",
    "@fastify/websocket": "^9.0.0",
    "@fastify/cors": "^9.0.0",
    "keytar": "^7.9.0",
    "dockerode": "^4.0.2",
    "node-pty": "^1.0.0",
    "simple-git": "^3.22.0",
    "better-sqlite3": "^9.4.0",
    "zod": "^3.22.0",
    "pino": "^8.18.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "tsup": "^8.0.0",
    "@types/node": "^20.11.0",
    "@types/better-sqlite3": "^7.6.8",
    "@types/ws": "^8.5.10"
  }
}
```

---

## Phase 1: 核心基础

**目标**: 实现最小可用版本，能读取凭证并创建 Sandbox

### Week 1-2: Node.js Sidecar 基础

#### 1.1 Sidecar 项目结构搭建

```bash
# apps/desktop/sidecar/src/ 目录结构
src/
├── index.ts           # 入口
├── server.ts          # Fastify 服务器
├── routes/
│   ├── credentials.ts # 凭证 API
│   ├── sandboxes.ts   # Sandbox API
│   └── terminals.ts   # 终端 WebSocket
├── services/
│   ├── credentials.ts # 凭证管理
│   ├── docker.ts      # Docker 管理
│   └── terminal.ts    # 终端管理
├── lib/
│   └── logger.ts      # 日志
└── types/
    └── index.ts       # 类型定义
```

#### 1.2 实现凭证管理

```typescript
// src/services/credentials.ts

import keytar from 'keytar';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const CLAUDE_SERVICE = 'Claude Code-credentials';
const CREDENTIAL_FILE = '.credentials.json';

export interface ClaudeCredentials {
  access: string;
  refresh?: string;
  expires?: number;
}

interface CredentialCache {
  credentials: ClaudeCredentials | null;
  readAt: number;
}

export class CredentialService {
  private cache: CredentialCache | null = null;
  private readonly cacheTTL = 60 * 1000; // 60 秒缓存

  async readCredentials(): Promise<ClaudeCredentials | null> {
    // 检查缓存
    if (this.cache && Date.now() - this.cache.readAt < this.cacheTTL) {
      return this.cache.credentials;
    }

    let credentials: ClaudeCredentials | null = null;

    // 1. 尝试从 Keychain 读取
    credentials = await this.readFromKeychain();

    // 2. 如果 Keychain 失败，尝试从文件读取
    if (!credentials) {
      credentials = await this.readFromFile();
    }

    // 更新缓存
    this.cache = { credentials, readAt: Date.now() };

    return credentials;
  }

  private async readFromKeychain(): Promise<ClaudeCredentials | null> {
    try {
      const secret = await keytar.getPassword(CLAUDE_SERVICE, 'default');
      if (!secret) return null;

      const parsed = JSON.parse(secret);
      return this.normalizeCredentials(parsed);
    } catch {
      return null;
    }
  }

  private async readFromFile(): Promise<ClaudeCredentials | null> {
    try {
      const credPath = path.join(os.homedir(), '.claude', CREDENTIAL_FILE);
      const content = await fs.readFile(credPath, 'utf-8');
      const parsed = JSON.parse(content);
      return this.normalizeCredentials(parsed);
    } catch {
      return null;
    }
  }

  private normalizeCredentials(raw: any): ClaudeCredentials | null {
    if (!raw?.access && !raw?.accessToken) return null;
    return {
      access: raw.access || raw.accessToken,
      refresh: raw.refresh || raw.refreshToken,
      expires: raw.expires || raw.expiresAt,
    };
  }

  isExpired(creds: ClaudeCredentials): boolean {
    if (!creds.expires) return false;
    const bufferMs = 5 * 60 * 1000; // 5 分钟缓冲
    return Date.now() > creds.expires * 1000 - bufferMs;
  }

  clearCache(): void {
    this.cache = null;
  }
}
```

**验收标准**:
- [ ] Sidecar 能正常启动
- [ ] `/api/credentials` 能返回凭证状态
- [ ] 能正确读取已登录的 Claude Code 凭证
- [ ] 凭证过期时返回错误

#### 1.3 实现 Docker 管理

```typescript
// src/services/docker.ts

import Docker from 'dockerode';
import { v4 as uuid } from 'uuid';
import type { CredentialService } from './credentials';

const SANDBOX_IMAGE = 'anycode/sandbox:latest';

export interface SandboxConfig {
  projectId: string;
  projectPath: string;
  branch?: string;
}

export interface SandboxInfo {
  id: string;
  containerId: string;
  status: string;
  projectId: string;
}

export class DockerService {
  private docker: Docker;
  private credentialService: CredentialService;

  constructor(credentialService: CredentialService) {
    this.docker = new Docker();
    this.credentialService = credentialService;
  }

  async createSandbox(config: SandboxConfig): Promise<SandboxInfo> {
    const credentials = await this.credentialService.readCredentials();
    if (!credentials) {
      throw new Error('No credentials found');
    }

    const sandboxId = uuid();

    const env = [
      `SANDBOX_ID=${sandboxId}`,
      `PROJECT_ID=${config.projectId}`,
      `ANTHROPIC_API_KEY=${credentials.access}`,
    ];

    if (config.branch) {
      env.push(`GIT_BRANCH=${config.branch}`);
    }

    const container = await this.docker.createContainer({
      Image: SANDBOX_IMAGE,
      name: `anycode-${sandboxId.slice(0, 8)}`,
      Env: env,
      HostConfig: {
        Memory: 4 * 1024 * 1024 * 1024, // 4GB
        NanoCpus: 2_000_000_000,         // 2 CPU
        Binds: [`${config.projectPath}:/workspace:rw`],
        SecurityOpt: ['no-new-privileges:true'],
        CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'SETUID', 'SETGID'],
      },
      Labels: {
        app: 'anycode-sandbox',
        sandbox_id: sandboxId,
        project_id: config.projectId,
      },
    });

    await container.start();

    return {
      id: sandboxId,
      containerId: container.id,
      status: 'running',
      projectId: config.projectId,
    };
  }

  async destroySandbox(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      await container.stop();
    } catch {
      // 忽略已停止的容器
    }
    await container.remove({ force: true });
  }

  async listSandboxes(): Promise<SandboxInfo[]> {
    const containers = await this.docker.listContainers({
      filters: { label: ['app=anycode-sandbox'] },
    });

    return containers.map((c) => ({
      id: c.Labels?.sandbox_id || '',
      containerId: c.Id,
      status: c.State || 'unknown',
      projectId: c.Labels?.project_id || '',
    }));
  }
}
```

**验收标准**:
- [ ] 能连接本地 Docker
- [ ] 能创建带凭证的 Sandbox 容器
- [ ] 能列出和销毁容器

### Week 2-3: Tauri Shell + 前端基础

#### 1.4 Tauri Shell (最小化 Rust)

```rust
// apps/desktop/src-tauri/src/main.rs

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct SidecarState(Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 获取 sidecar 路径
            let sidecar_dir = app
                .path_resolver()
                .resolve_resource("sidecar")
                .expect("failed to resolve sidecar directory");

            let sidecar_script = sidecar_dir.join("dist").join("index.js");

            // 启动 Node.js Sidecar
            let child = Command::new("node")
                .arg(&sidecar_script)
                .current_dir(&sidecar_dir)
                .spawn()
                .expect("failed to start sidecar");

            app.manage(SidecarState(Mutex::new(Some(child))));

            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                // 关闭时清理 Sidecar
                if let Some(state) = event.window().try_state::<SidecarState>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```toml
# apps/desktop/src-tauri/Cargo.toml
[package]
name = "anycode"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
serde = { version = "1", features = ["derive"] }

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

#### 1.5 React 项目结构

```bash
apps/desktop/src/
├── components/
│   └── ui/              # shadcn/ui 组件
├── hooks/
│   └── useApi.ts        # API hooks
├── stores/
│   └── appStore.ts      # Zustand store
├── pages/
│   └── Home.tsx
├── lib/
│   ├── api.ts           # Sidecar API 封装
│   └── utils.ts
├── App.tsx
├── main.tsx
└── index.css
```

#### 1.6 安装前端依赖

```bash
cd apps/desktop

# UI 框架
pnpm add zustand
pnpm add -D tailwindcss postcss autoprefixer
pnpm add -D @types/react @types/react-dom

# shadcn/ui
pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add button card dialog toast
```

#### 1.7 Sidecar API 封装

```typescript
// src/lib/api.ts

const SIDECAR_URL = 'http://localhost:19876';

export interface ClaudeCredentials {
  access: string;
  refresh?: string;
  expires?: number;
}

export interface SandboxInfo {
  id: string;
  containerId: string;
  status: string;
  projectId: string;
}

export const api = {
  // 凭证
  async checkLogin(): Promise<boolean> {
    const res = await fetch(`${SIDECAR_URL}/api/credentials`);
    const data = await res.json();
    return data.loggedIn;
  },

  async getCredentials(): Promise<ClaudeCredentials | null> {
    const res = await fetch(`${SIDECAR_URL}/api/credentials`);
    const data = await res.json();
    return data.credentials;
  },

  // Sandbox
  async createSandbox(config: {
    projectId: string;
    projectPath: string;
    branch?: string;
  }): Promise<SandboxInfo> {
    const res = await fetch(`${SIDECAR_URL}/api/sandboxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async destroySandbox(containerId: string): Promise<void> {
    await fetch(`${SIDECAR_URL}/api/sandboxes/${containerId}`, {
      method: 'DELETE',
    });
  },

  async listSandboxes(): Promise<SandboxInfo[]> {
    const res = await fetch(`${SIDECAR_URL}/api/sandboxes`);
    return res.json();
  },
};
```

#### 1.8 首页实现

```tsx
// src/pages/Home.tsx
// 显示：
// - Claude Code 登录状态
// - Docker 连接状态
// - Sandbox 列表
// - 创建新 Sandbox 按钮
```

**验收标准**:
- [ ] 应用启动显示主界面
- [ ] 显示 Claude Code 登录状态
- [ ] 能创建和销毁 Sandbox

### Week 3-4: Sandbox 镜像

#### 1.9 构建 Sandbox Docker 镜像

```dockerfile
# packages/sandbox-image/Dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# 基础工具
RUN apt-get update && apt-get install -y \
    curl \
    git \
    vim \
    build-essential \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# 安装 Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# 安装 Claude Code
RUN npm install -g @anthropic-ai/claude-code

# 创建工作用户
RUN useradd -m -s /bin/bash developer
USER developer
WORKDIR /workspace

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD claude --version || exit 1

ENTRYPOINT ["/bin/bash"]
```

```bash
# 构建镜像
cd packages/sandbox-image
docker build -t anycode/sandbox:latest .
```

**验收标准**:
- [ ] 镜像构建成功
- [ ] 容器内 Claude Code 可用
- [ ] 凭证注入后能正常调用 Claude API

---

## Phase 2: 终端体验

**目标**: 实现完整的交互式终端

### Week 5-6: PTY 终端

#### 2.1 Node.js PTY 管理

```typescript
// src/services/terminal.ts

import * as pty from 'node-pty';
import { WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';

export interface TerminalSession {
  id: string;
  sandboxId: string;
  pty: pty.IPty;
  ws: WebSocket | null;
}

export class TerminalService {
  private sessions = new Map<string, TerminalSession>();

  createTerminal(sandboxId: string, containerId: string): string {
    const sessionId = uuid();

    // 在容器内创建 PTY
    const shell = pty.spawn('docker', ['exec', '-it', containerId, '/bin/bash'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: '/workspace',
    });

    const session: TerminalSession = {
      id: sessionId,
      sandboxId,
      pty: shell,
      ws: null,
    };

    this.sessions.set(sessionId, session);

    return sessionId;
  }

  attachWebSocket(sessionId: string, ws: WebSocket): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.ws = ws;

    // PTY -> WebSocket
    session.pty.onData((data) => {
      if (session.ws?.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({ type: 'output', data }));
      }
    });

    // WebSocket -> PTY
    ws.on('message', (msg) => {
      const message = JSON.parse(msg.toString());
      if (message.type === 'input') {
        session.pty.write(message.data);
      } else if (message.type === 'resize') {
        session.pty.resize(message.cols, message.rows);
      }
    });

    ws.on('close', () => {
      session.ws = null;
    });
  }

  closeTerminal(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.kill();
      session.ws?.close();
      this.sessions.delete(sessionId);
    }
  }
}
```

#### 2.2 WebSocket 路由

```typescript
// src/routes/terminals.ts

import { FastifyPluginAsync } from 'fastify';
import { TerminalService } from '../services/terminal';

export const terminalRoutes: FastifyPluginAsync = async (app) => {
  const terminalService = new TerminalService();

  // 创建终端
  app.post<{
    Body: { sandboxId: string; containerId: string };
  }>('/api/terminals', async (req) => {
    const { sandboxId, containerId } = req.body;
    const sessionId = terminalService.createTerminal(sandboxId, containerId);
    return { sessionId };
  });

  // WebSocket 连接
  app.get<{
    Params: { sessionId: string };
  }>('/ws/terminals/:sessionId', { websocket: true }, (socket, req) => {
    const { sessionId } = req.params;
    terminalService.attachWebSocket(sessionId, socket);
  });

  // 关闭终端
  app.delete<{
    Params: { sessionId: string };
  }>('/api/terminals/:sessionId', async (req) => {
    const { sessionId } = req.params;
    terminalService.closeTerminal(sessionId);
    return { success: true };
  });
};
```

#### 2.3 前端 xterm.js 集成

```bash
pnpm add xterm xterm-addon-fit xterm-addon-web-links
```

```tsx
// src/components/terminal/Terminal.tsx

import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useEffect, useRef } from 'react';
import 'xterm/css/xterm.css';

interface TerminalProps {
  sessionId: string;
}

export function Terminal({ sessionId }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // 初始化 xterm.js
    const xterm = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;

    // 连接 WebSocket
    const ws = new WebSocket(`ws://localhost:19876/ws/terminals/${sessionId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'output') {
        xterm.write(message.data);
      }
    };

    xterm.onData((data) => {
      ws.send(JSON.stringify({ type: 'input', data }));
    });

    xterm.onResize(({ cols, rows }) => {
      ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    });

    // 窗口大小变化时调整终端
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      xterm.dispose();
    };
  }, [sessionId]);

  return <div ref={terminalRef} className="h-full w-full" />;
}
```

**验收标准**:
- [ ] 终端能正常显示输出
- [ ] 能输入命令并执行
- [ ] 支持 ANSI 颜色
- [ ] 终端大小自适应

### Week 7: 终端增强

#### 2.4 多终端标签

```tsx
// src/components/terminal/TerminalTabs.tsx

// 实现：
// - 标签页切换
// - 新建/关闭终端
// - 终端状态指示
// - 快捷键支持 (Cmd+T, Cmd+W)
```

#### 2.5 终端会话持久化

```typescript
// src/services/database.ts

import Database from 'better-sqlite3';

// SQLite 存储：
// - 终端会话信息
// - 历史命令
// - 会话恢复
```

**验收标准**:
- [ ] 支持多终端标签
- [ ] 应用重启后能恢复会话
- [ ] 快捷键正常工作

---

## Phase 3: 项目管理

**目标**: 完整的 GitHub 项目导入和管理

### Week 8-9: Git 集成

#### 3.1 Node.js Git 操作

```typescript
// src/services/git.ts

import simpleGit, { SimpleGit } from 'simple-git';

export class GitService {
  async cloneRepository(url: string, path: string, branch?: string): Promise<void> {
    const git = simpleGit();
    const options = branch ? ['--branch', branch] : [];
    await git.clone(url, path, options);
  }

  async listBranches(repoPath: string): Promise<string[]> {
    const git = simpleGit(repoPath);
    const branches = await git.branchLocal();
    return branches.all;
  }

  async checkoutBranch(repoPath: string, branch: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.checkout(branch);
  }

  async createBranch(repoPath: string, branch: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.checkoutLocalBranch(branch);
  }

  async getDiff(repoPath: string): Promise<string> {
    const git = simpleGit(repoPath);
    return git.diff();
  }

  async commit(repoPath: string, message: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.add('.');
    await git.commit(message);
  }

  async push(repoPath: string, branch: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.push('origin', branch);
  }
}
```

#### 3.2 GitHub API 集成

```typescript
// src/services/github.ts

// 使用 @octokit/rest 或直接 HTTP 调用
// - 获取用户仓库列表
// - 创建 Pull Request
// - 获取 PR 状态
```

#### 3.3 前端项目管理

```tsx
// src/pages/Projects.tsx
// - 项目列表
// - 导入项目对话框
// - 项目设置

// src/components/project/ImportDialog.tsx
// - GitHub URL 输入
// - 分支选择
// - 克隆进度
```

**验收标准**:
- [ ] 能从 GitHub 克隆项目
- [ ] 能切换和创建分支
- [ ] 能查看代码差异
- [ ] 能创建 PR

### Week 10: 文件管理

#### 3.4 文件树组件

```tsx
// src/components/project/FileTree.tsx

// 实现：
// - 目录树展示
// - 文件图标
// - 展开/折叠
// - 右键菜单
```

#### 3.5 差异查看器

```bash
pnpm add react-diff-viewer-continued
```

```tsx
// src/components/project/DiffViewer.tsx

// 显示：
// - 文件变更列表
// - 并排/统一差异视图
// - 语法高亮
```

**验收标准**:
- [ ] 文件树正确显示
- [ ] 差异查看器工作正常
- [ ] 支持常见文件类型语法高亮

---

## Phase 4: 多 Sandbox

**目标**: 支持并行运行多个 Sandbox

### Week 11-12: 并行架构

#### 4.1 Sandbox 调度器

```typescript
// src/services/scheduler.ts

import { DockerService, SandboxInfo, SandboxConfig } from './docker';

export class SandboxScheduler {
  private maxConcurrent: number;
  private running: SandboxInfo[] = [];
  private queue: SandboxConfig[] = [];
  private dockerService: DockerService;

  constructor(dockerService: DockerService, maxConcurrent = 4) {
    this.dockerService = dockerService;
    this.maxConcurrent = maxConcurrent;
  }

  async schedule(config: SandboxConfig): Promise<SandboxInfo | null> {
    if (this.running.length >= this.maxConcurrent) {
      this.queue.push(config);
      return null;
    }

    const sandbox = await this.dockerService.createSandbox(config);
    this.running.push(sandbox);
    return sandbox;
  }

  async onComplete(sandboxId: string): Promise<void> {
    this.running = this.running.filter((s) => s.id !== sandboxId);

    // 处理队列中的下一个
    if (this.queue.length > 0) {
      const nextConfig = this.queue.shift()!;
      await this.schedule(nextConfig);
    }
  }

  getStats() {
    return {
      running: this.running.length,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}
```

#### 4.2 资源监控

```typescript
// src/services/monitor.ts

import Docker from 'dockerode';

// 监控每个 Sandbox：
// - CPU 使用率
// - 内存使用
// - 网络 I/O
// - 磁盘使用
```

#### 4.3 前端多 Sandbox 视图

```tsx
// src/pages/Dashboard.tsx

// 显示：
// - 所有 Sandbox 状态卡片
// - 资源使用图表
// - 快速操作按钮
```

**验收标准**:
- [ ] 能同时运行多个 Sandbox
- [ ] 资源监控正常显示
- [ ] Sandbox 间相互隔离

---

## Phase 5: 高级功能

**目标**: 工作流和高级特性

### Week 13-14: 工作流引擎

#### 5.1 工作流定义

```typescript
// src/services/workflow.ts

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

export type WorkflowStep =
  | { type: 'claude_task'; prompt: string; branch: string }
  | { type: 'git_operation'; operation: 'commit' | 'push' | 'create_pr' }
  | { type: 'shell_command'; command: string }
  | { type: 'parallel'; steps: WorkflowStep[] };

export class WorkflowEngine {
  async execute(workflow: Workflow): Promise<void> {
    // 执行工作流
  }

  async pause(workflowId: string): Promise<void> {
    // 暂停
  }

  async resume(workflowId: string): Promise<void> {
    // 恢复
  }

  async cancel(workflowId: string): Promise<void> {
    // 取消
  }
}
```

#### 5.2 工作流编辑器

```tsx
// src/components/workflow/WorkflowEditor.tsx

// 可视化编辑：
// - 拖拽添加步骤
// - 连线定义依赖
// - 参数配置面板
```

### Week 15: 终端录制

#### 5.3 会话录制

```typescript
// src/services/recording.ts

// asciinema 格式录制
// - 开始/停止录制
// - 保存为文件
// - 回放支持
```

```tsx
// src/components/terminal/Player.tsx

// 回放组件：
// - 播放/暂停
// - 进度条
// - 速度控制
```

**验收标准**:
- [ ] 工作流能正常执行
- [ ] 终端录制和回放工作
- [ ] 可视化编辑器可用

---

## Phase 6: 发布分发

**目标**: 构建可分发的应用

### Week 16: 打包签名

#### 6.1 macOS 签名

```bash
# 配置签名证书
# Apple Developer ID Application 证书

# tauri.conf.json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAMID)",
      "entitlements": "./entitlements.plist"
    }
  }
}
```

```xml
<!-- entitlements.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
</dict>
</plist>
```

#### 6.2 公证 (Notarization)

```bash
# 使用 tauri 内置公证
# 或手动 xcrun notarytool

# 配置环境变量
APPLE_ID=your@email.com
APPLE_PASSWORD=app-specific-password
APPLE_TEAM_ID=XXXXXXXXXX
```

#### 6.3 Windows 签名

```bash
# 购买代码签名证书 (如 DigiCert, Sectigo)
# 配置 tauri.conf.json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "...",
      "digestAlgorithm": "sha256"
    }
  }
}
```

#### 6.4 Linux 打包

```bash
# 生成多种格式
# - AppImage (通用)
# - .deb (Debian/Ubuntu)
# - .rpm (Fedora/RHEL)

cargo tauri build --target x86_64-unknown-linux-gnu
```

### Week 17: 自动更新

#### 6.5 更新服务器

```typescript
// services/update-server/src/index.ts

// 简单的更新服务器 (Node.js)：
// - 版本检查 API
// - 下载端点
// - 签名验证
```

#### 6.6 Tauri Updater 配置

```json
// tauri.conf.json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.anycode.jacky.cn/{{target}}/{{current_version}}"
      ],
      "pubkey": "..."
    }
  }
}
```

### Week 18: CI/CD

#### 6.7 GitHub Actions

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        platform:
          - macos-latest
          - ubuntu-22.04
          - windows-latest

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        run: pnpm install

      - name: Build Sidecar
        run: pnpm --filter @anycode/sidecar build

      - name: Build Tauri
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        with:
          tagName: v__VERSION__
          releaseName: 'AnyCode v__VERSION__'
          releaseBody: 'See the changelog for details.'
          releaseDraft: true
          prerelease: false
```

**验收标准**:
- [ ] macOS 应用签名和公证通过
- [ ] Windows 应用签名通过
- [ ] Linux 包正常安装
- [ ] 自动更新功能正常
- [ ] CI/CD 流程完整

---

## 时间线总结

| 阶段 | 时长 | 主要产出 |
|------|------|----------|
| Phase 1 | 4 周 | MVP - 凭证读取 + Sandbox 创建 |
| Phase 2 | 3 周 | 完整终端体验 |
| Phase 3 | 3 周 | 项目管理 + Git 集成 |
| Phase 4 | 2 周 | 多 Sandbox 并行 |
| Phase 5 | 3 周 | 工作流 + 高级功能 |
| Phase 6 | 3 周 | 打包签名 + 发布 |
| **总计** | **18 周** | **完整产品** |

---

## 快速开始命令

```bash
# 克隆并初始化
cd /Users/jacky/projects/dev/anycode
pnpm install

# 开发模式（同时启动 Sidecar 和前端）
pnpm dev

# 单独启动 Sidecar（调试用）
pnpm dev:sidecar

# 构建
pnpm build

# 运行测试
pnpm test

# 构建发布版本
cargo tauri build
```

---

## 注意事项

### 安全
- 凭证只在内存中，不写入日志
- Sandbox 网络隔离
- 定期检查依赖漏洞

### 性能
- 终端输出使用虚拟化
- 大文件差异分块加载
- Docker 镜像层缓存

### 用户体验
- 首次启动引导流程
- 错误信息友好展示
- 操作可撤销

---

*文档版本: 2.0 (Node.js Sidecar 架构)*
*最后更新: 2026-01-28*
