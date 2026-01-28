# AnyCode 详细开发路线图

## 架构概览

```
Tauri (Rust 壳) ──spawn──> Node.js Sidecar ──HTTP/WS──> Frontend (React)
     │                           │
     │                           ├── Keychain (keytar)
     │                           ├── Docker (dockerode)
     │                           ├── PTY (node-pty)
     │                           └── Git (simple-git)
     │
     └── 窗口管理、系统托盘、原生菜单
```

## 任务编号规则

- `P1-W1-01`: Phase 1, Week 1, Task 01
- 每个任务包含：目标、具体步骤、代码示例、验收标准

---

## Phase 1: 核心基础 (Week 1-4)

### Week 1: 项目脚手架

#### P1-W1-01: 创建 Monorepo 结构

**目标**: 搭建完整的项目目录结构

**步骤**:
```bash
cd /Users/jacky/projects/dev/anycode

# 1. 初始化
pnpm init

# 2. 创建目录
mkdir -p apps/{desktop/src,desktop/src-tauri,sidecar/src}
mkdir -p packages/shared/src
mkdir -p packages/sandbox-image
mkdir -p docs scripts

# 3. 配置文件
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

cat > .nvmrc << 'EOF'
20
EOF

cat > .gitignore << 'EOF'
node_modules/
dist/
target/
.DS_Store
*.log
.env
.env.local
EOF
```

**根 package.json**:
```json
{
  "name": "anycode",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "dev:sidecar": "pnpm --filter @anycode/sidecar dev",
    "dev:desktop": "pnpm --filter @anycode/desktop dev",
    "build:sidecar": "pnpm --filter @anycode/sidecar build",
    "build:desktop": "pnpm --filter @anycode/desktop build"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

**验收标准**:
- [ ] `pnpm install` 成功
- [ ] 目录结构完整

---

#### P1-W1-02: 初始化 Sidecar 项目

**目标**: 创建 Node.js Sidecar 服务

**步骤**:
```bash
cd apps/sidecar
pnpm init
```

**package.json**:
```json
{
  "name": "@anycode/sidecar",
  "version": "0.1.0",
  "private": true,
  "type": "module",
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
    "dockerode": "^4.0.0",
    "node-pty": "^1.0.0",
    "simple-git": "^3.22.0",
    "better-sqlite3": "^9.4.0",
    "zod": "^3.22.0",
    "pino": "^8.18.0",
    "pino-pretty": "^10.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/better-sqlite3": "^7.6.8",
    "@types/dockerode": "^3.3.23",
    "tsx": "^4.7.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**验收标准**:
- [ ] `pnpm install` 成功
- [ ] `pnpm dev` 启动无报错

---

#### P1-W1-03: Sidecar 入口和服务器

**目标**: 创建 Fastify HTTP 服务

**src/index.ts**:
```typescript
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.PORT || '19876');

async function main() {
  const server = await createServer();

  try {
    await server.listen({ port: PORT, host: '127.0.0.1' });
    logger.info(`Sidecar running at http://127.0.0.1:${PORT}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

main();
```

**src/server.ts**:
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { logger } from './utils/logger.js';

// Routes
import { credentialsRoutes } from './routes/credentials.js';
import { sandboxRoutes } from './routes/sandboxes.js';
import { terminalRoutes } from './routes/terminals.js';
import { projectRoutes } from './routes/projects.js';

export async function createServer() {
  const server = Fastify({
    logger: false, // 使用自定义 logger
  });

  // 插件
  await server.register(cors, {
    origin: true,
  });
  await server.register(websocket);

  // 健康检查
  server.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // API 路由
  await server.register(credentialsRoutes, { prefix: '/api/credentials' });
  await server.register(sandboxRoutes, { prefix: '/api/sandboxes' });
  await server.register(terminalRoutes, { prefix: '/api/terminals' });
  await server.register(projectRoutes, { prefix: '/api/projects' });

  return server;
}
```

**src/utils/logger.ts**:
```typescript
import pino from 'pino';

export const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});
```

**验收标准**:
- [ ] 服务启动在 19876 端口
- [ ] `/health` 返回 `{ status: 'ok' }`

---

#### P1-W1-04: 共享类型包

**目标**: 创建前后端共享的类型定义

**packages/shared/package.json**:
```json
{
  "name": "@anycode/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --dts --watch"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  }
}
```

**packages/shared/src/types/credentials.ts**:
```typescript
export interface ClaudeCredentials {
  access: string;
  refresh?: string;
  expires?: number;
}

export interface CredentialStatus {
  loggedIn: boolean;
  expiresAt?: number;
  isExpiringSoon?: boolean;
  error?: string;
}
```

**packages/shared/src/types/sandbox.ts**:
```typescript
export interface SandboxConfig {
  projectId: string;
  projectPath: string;
  name?: string;
  branch?: string;
  cpuLimit?: number;
  memoryLimit?: number;
}

export interface SandboxInfo {
  id: string;
  containerId: string;
  name: string;
  status: 'pending' | 'running' | 'stopped' | 'failed';
  projectId: string;
  createdAt: string;
}
```

**packages/shared/src/types/terminal.ts**:
```typescript
export interface TerminalConfig {
  sandboxId: string;
  cols?: number;
  rows?: number;
  shell?: string;
}

export interface TerminalInfo {
  id: string;
  sandboxId: string;
  pid: number;
  status: 'running' | 'closed';
  createdAt: string;
}

// WebSocket 消息类型
export interface TerminalMessage {
  type: 'input' | 'output' | 'resize' | 'ping' | 'pong';
  data?: string;
  cols?: number;
  rows?: number;
}
```

**packages/shared/src/types/project.ts**:
```typescript
export interface Project {
  id: string;
  name: string;
  path: string;
  repositoryUrl?: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  repositoryUrl?: string;
  localPath?: string;
}
```

**packages/shared/src/index.ts**:
```typescript
export * from './types/credentials.js';
export * from './types/sandbox.js';
export * from './types/terminal.js';
export * from './types/project.js';
```

**验收标准**:
- [ ] `pnpm build` 成功
- [ ] 类型可被其他包引用

---

### Week 2: 凭证管理模块

#### P1-W2-01: 凭证服务基础结构

**目标**: 实现凭证读取服务

**apps/sidecar/src/services/credentials.ts**:
```typescript
import keytar from 'keytar';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { ClaudeCredentials, CredentialStatus } from '@anycode/shared';
import { logger } from '../utils/logger.js';

const CLAUDE_SERVICE = 'Claude Code-credentials';
const CREDENTIAL_FILE = '.credentials.json';
const CACHE_TTL_MS = 60 * 1000; // 60 秒
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 分钟

interface CredentialCache {
  credentials: ClaudeCredentials;
  cachedAt: number;
}

class CredentialService {
  private cache: CredentialCache | null = null;

  /**
   * 读取凭证（带缓存）
   */
  async readCredentials(): Promise<ClaudeCredentials> {
    // 检查缓存
    if (this.isCacheValid()) {
      logger.debug('Using cached credentials');
      return this.cache!.credentials;
    }

    // 尝试从 Keychain 读取
    let credentials = await this.readFromKeychain();

    // 备用：从文件读取
    if (!credentials) {
      credentials = await this.readFromFile();
    }

    if (!credentials) {
      throw new Error('No Claude Code credentials found. Please login with: claude login');
    }

    // 检查过期
    if (this.isExpired(credentials)) {
      throw new Error('Claude Code credentials expired. Please re-login with: claude login');
    }

    // 更新缓存
    this.cache = {
      credentials,
      cachedAt: Date.now(),
    };

    return credentials;
  }

  /**
   * 获取凭证状态
   */
  async getStatus(): Promise<CredentialStatus> {
    try {
      const credentials = await this.readCredentials();
      return {
        loggedIn: true,
        expiresAt: credentials.expires,
        isExpiringSoon: this.isExpiringSoon(credentials),
      };
    } catch (error) {
      return {
        loggedIn: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 检查是否已登录
   */
  async checkLogin(): Promise<boolean> {
    try {
      await this.readCredentials();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 从 Keychain 读取
   */
  private async readFromKeychain(): Promise<ClaudeCredentials | null> {
    try {
      const secret = await keytar.getPassword(CLAUDE_SERVICE, 'default');
      if (!secret) {
        logger.debug('No credentials in Keychain');
        return null;
      }

      const parsed = JSON.parse(secret);
      return this.normalizeCredentials(parsed);
    } catch (error) {
      logger.debug('Keychain read failed:', error);
      return null;
    }
  }

  /**
   * 从文件读取
   */
  private async readFromFile(): Promise<ClaudeCredentials | null> {
    try {
      const filePath = join(homedir(), '.claude', CREDENTIAL_FILE);
      const content = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // 如果没有过期时间，根据文件修改时间估算
      if (!parsed.expires) {
        const fileStat = await stat(filePath);
        const modifiedMs = fileStat.mtimeMs;
        parsed.expires = Math.floor(modifiedMs / 1000) + 3600; // 1小时后过期
      }

      return this.normalizeCredentials(parsed);
    } catch (error) {
      logger.debug('File read failed:', error);
      return null;
    }
  }

  /**
   * 标准化凭证格式
   */
  private normalizeCredentials(raw: any): ClaudeCredentials | null {
    const access = raw.access || raw.accessToken;
    if (!access) {
      return null;
    }

    return {
      access,
      refresh: raw.refresh || raw.refreshToken,
      expires: raw.expires || raw.expiresAt,
    };
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    const age = Date.now() - this.cache.cachedAt;
    return age < CACHE_TTL_MS && !this.isExpired(this.cache.credentials);
  }

  /**
   * 检查是否过期
   */
  private isExpired(credentials: ClaudeCredentials): boolean {
    if (!credentials.expires) return false;
    const expiresMs = credentials.expires * 1000;
    return Date.now() > expiresMs - EXPIRY_BUFFER_MS;
  }

  /**
   * 检查是否即将过期（1小时内）
   */
  private isExpiringSoon(credentials: ClaudeCredentials): boolean {
    if (!credentials.expires) return false;
    const expiresMs = credentials.expires * 1000;
    const oneHourMs = 60 * 60 * 1000;
    return Date.now() > expiresMs - oneHourMs;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = null;
  }
}

export const credentialService = new CredentialService();
```

**验收标准**:
- [ ] 能从 Keychain 读取凭证
- [ ] 能从文件读取凭证
- [ ] 缓存机制正常工作

---

#### P1-W2-02: 凭证 API 路由

**目标**: 实现凭证相关的 HTTP API

**apps/sidecar/src/routes/credentials.ts**:
```typescript
import type { FastifyPluginAsync } from 'fastify';
import { credentialService } from '../services/credentials.js';

export const credentialsRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/credentials/status - 获取登录状态
  server.get('/status', async (request, reply) => {
    const status = await credentialService.getStatus();
    return status;
  });

  // GET /api/credentials/check - 检查是否已登录
  server.get('/check', async (request, reply) => {
    const loggedIn = await credentialService.checkLogin();
    return { loggedIn };
  });

  // POST /api/credentials/refresh-cache - 刷新缓存
  server.post('/refresh-cache', async (request, reply) => {
    credentialService.clearCache();
    const status = await credentialService.getStatus();
    return status;
  });
};
```

**验收标准**:
- [ ] `GET /api/credentials/status` 返回正确状态
- [ ] `GET /api/credentials/check` 返回登录状态

---

### Week 3: Docker 管理模块

#### P1-W3-01: Docker 服务基础结构

**目标**: 实现 Docker 容器管理服务

**apps/sidecar/src/services/docker.ts**:
```typescript
import Docker from 'dockerode';
import type { SandboxConfig, SandboxInfo } from '@anycode/shared';
import { credentialService } from './credentials.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

const SANDBOX_IMAGE = 'anycode/sandbox:latest';
const SANDBOX_LABEL = 'app=anycode-sandbox';

class DockerService {
  private docker: Docker;
  private initialized = false;

  constructor() {
    this.docker = new Docker();
  }

  /**
   * 检查 Docker 连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.docker.ping();
      this.initialized = true;
      return true;
    } catch (error) {
      logger.error('Docker connection failed:', error);
      return false;
    }
  }

  /**
   * 创建 Sandbox 容器
   */
  async createSandbox(config: SandboxConfig): Promise<SandboxInfo> {
    if (!this.initialized) {
      await this.checkConnection();
    }

    // 获取凭证
    const credentials = await credentialService.readCredentials();

    const sandboxId = randomUUID();
    const containerName = config.name || `anycode-${sandboxId.slice(0, 8)}`;

    // 环境变量
    const env = [
      `SANDBOX_ID=${sandboxId}`,
      `PROJECT_ID=${config.projectId}`,
      `ANTHROPIC_API_KEY=${credentials.access}`,
      'TERM=xterm-256color',
    ];

    if (config.branch) {
      env.push(`GIT_BRANCH=${config.branch}`);
    }

    // 资源限制
    const memory = config.memoryLimit || 4 * 1024 * 1024 * 1024; // 4GB
    const nanoCpus = (config.cpuLimit || 2) * 1e9;

    logger.info(`Creating sandbox: ${containerName}`);

    // 创建容器
    const container = await this.docker.createContainer({
      Image: SANDBOX_IMAGE,
      name: containerName,
      Env: env,
      WorkingDir: '/workspace',
      Tty: true,
      OpenStdin: true,
      HostConfig: {
        Memory: memory,
        NanoCpus: nanoCpus,
        Binds: [`${config.projectPath}:/workspace:rw`],
        SecurityOpt: ['no-new-privileges:true'],
        CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE'],
      },
      Labels: {
        'app': 'anycode-sandbox',
        'sandbox_id': sandboxId,
        'project_id': config.projectId,
      },
    });

    // 启动容器
    await container.start();

    return {
      id: sandboxId,
      containerId: container.id,
      name: containerName,
      status: 'running',
      projectId: config.projectId,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 停止 Sandbox
   */
  async stopSandbox(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.stop({ t: 10 });
  }

  /**
   * 销毁 Sandbox
   */
  async destroySandbox(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);

    // 先尝试停止
    try {
      await container.stop({ t: 10 });
    } catch (e) {
      // 可能已经停止
    }

    // 删除容器
    await container.remove({ force: true, v: true });
    logger.info(`Sandbox destroyed: ${containerId}`);
  }

  /**
   * 列出所有 Sandbox
   */
  async listSandboxes(): Promise<SandboxInfo[]> {
    if (!this.initialized) {
      await this.checkConnection();
    }

    const containers = await this.docker.listContainers({
      all: true,
      filters: {
        label: [SANDBOX_LABEL],
      },
    });

    return containers.map((c) => ({
      id: c.Labels?.['sandbox_id'] || '',
      containerId: c.Id,
      name: c.Names?.[0]?.replace(/^\//, '') || '',
      status: this.mapContainerState(c.State),
      projectId: c.Labels?.['project_id'] || '',
      createdAt: new Date(c.Created * 1000).toISOString(),
    }));
  }

  /**
   * 获取 Sandbox 详情
   */
  async getSandbox(containerId: string): Promise<SandboxInfo> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();

    return {
      id: info.Config?.Labels?.['sandbox_id'] || '',
      containerId: info.Id,
      name: info.Name?.replace(/^\//, '') || '',
      status: this.mapContainerState(info.State?.Status),
      projectId: info.Config?.Labels?.['project_id'] || '',
      createdAt: info.Created || '',
    };
  }

  /**
   * 在 Sandbox 中执行命令
   */
  async execInSandbox(containerId: string, command: string[]): Promise<string> {
    const container = this.docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    return new Promise((resolve, reject) => {
      let output = '';

      stream.on('data', (chunk: Buffer) => {
        // Docker 流格式：前 8 字节是头
        output += chunk.slice(8).toString();
      });

      stream.on('end', () => resolve(output));
      stream.on('error', reject);
    });
  }

  /**
   * 映射容器状态
   */
  private mapContainerState(state?: string): SandboxInfo['status'] {
    switch (state?.toLowerCase()) {
      case 'running':
        return 'running';
      case 'exited':
      case 'dead':
        return 'stopped';
      case 'created':
      case 'restarting':
        return 'pending';
      default:
        return 'failed';
    }
  }
}

export const dockerService = new DockerService();
```

**验收标准**:
- [ ] 能连接 Docker
- [ ] 能创建/删除容器
- [ ] 能列出所有 sandbox

---

#### P1-W3-02: Docker API 路由

**目标**: 实现 Docker 相关的 HTTP API

**apps/sidecar/src/routes/sandboxes.ts**:
```typescript
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { dockerService } from '../services/docker.js';

const CreateSandboxSchema = z.object({
  projectId: z.string(),
  projectPath: z.string(),
  name: z.string().optional(),
  branch: z.string().optional(),
  cpuLimit: z.number().optional(),
  memoryLimit: z.number().optional(),
});

export const sandboxRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/sandboxes - 列出所有 sandbox
  server.get('/', async () => {
    return dockerService.listSandboxes();
  });

  // POST /api/sandboxes - 创建 sandbox
  server.post('/', async (request, reply) => {
    const config = CreateSandboxSchema.parse(request.body);
    const sandbox = await dockerService.createSandbox(config);
    reply.code(201);
    return sandbox;
  });

  // GET /api/sandboxes/:id - 获取 sandbox 详情
  server.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return dockerService.getSandbox(id);
  });

  // DELETE /api/sandboxes/:id - 删除 sandbox
  server.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await dockerService.destroySandbox(id);
    reply.code(204);
  });

  // POST /api/sandboxes/:id/stop - 停止 sandbox
  server.post('/:id/stop', async (request, reply) => {
    const { id } = request.params as { id: string };
    await dockerService.stopSandbox(id);
    reply.code(204);
  });

  // POST /api/sandboxes/:id/exec - 在 sandbox 中执行命令
  server.post('/:id/exec', async (request) => {
    const { id } = request.params as { id: string };
    const { command } = request.body as { command: string[] };
    const output = await dockerService.execInSandbox(id, command);
    return { output };
  });

  // GET /api/sandboxes/docker/status - Docker 连接状态
  server.get('/docker/status', async () => {
    const connected = await dockerService.checkConnection();
    return { connected };
  });
};
```

**验收标准**:
- [ ] 所有 API 端点可用
- [ ] 错误正确返回

---

### Week 4: 前端基础与集成

#### P1-W4-01: 初始化 Tauri + React 前端

**目标**: 创建 Tauri 应用壳

**apps/desktop/package.json**:
```json
{
  "name": "@anycode/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.5.0",
    "@tauri-apps/api": "^2.0.0",
    "@anycode/shared": "workspace:*",
    "ky": "^1.2.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.1.0"
  }
}
```

**apps/desktop/src-tauri/tauri.conf.json**:
```json
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
        "minHeight": 600
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.png"]
  }
}
```

**apps/desktop/src-tauri/src/main.rs** (最小化):
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::process::Command;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 启动 Node.js Sidecar
            let sidecar_path = app.path().resource_dir()
                .expect("failed to get resource dir")
                .join("sidecar");

            std::thread::spawn(move || {
                Command::new("node")
                    .arg(sidecar_path.join("index.js"))
                    .spawn()
                    .expect("failed to start sidecar");
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**验收标准**:
- [ ] `pnpm tauri:dev` 启动成功
- [ ] 窗口正常显示

---

#### P1-W4-02: 前端 API 客户端

**目标**: 封装 Sidecar API 调用

**apps/desktop/src/lib/api.ts**:
```typescript
import ky from 'ky';
import type {
  CredentialStatus,
  SandboxConfig,
  SandboxInfo,
} from '@anycode/shared';

const client = ky.create({
  prefixUrl: 'http://127.0.0.1:19876/api',
  timeout: 30000,
});

export const api = {
  // 凭证
  credentials: {
    getStatus: () => client.get('credentials/status').json<CredentialStatus>(),
    checkLogin: () => client.get('credentials/check').json<{ loggedIn: boolean }>(),
  },

  // Docker
  docker: {
    checkStatus: () => client.get('sandboxes/docker/status').json<{ connected: boolean }>(),
  },

  // Sandbox
  sandbox: {
    list: () => client.get('sandboxes').json<SandboxInfo[]>(),
    create: (config: SandboxConfig) =>
      client.post('sandboxes', { json: config }).json<SandboxInfo>(),
    get: (id: string) => client.get(`sandboxes/${id}`).json<SandboxInfo>(),
    destroy: (id: string) => client.delete(`sandboxes/${id}`),
    stop: (id: string) => client.post(`sandboxes/${id}/stop`),
    exec: (id: string, command: string[]) =>
      client.post(`sandboxes/${id}/exec`, { json: { command } }).json<{ output: string }>(),
  },
};

export default api;
```

**验收标准**:
- [ ] API 客户端类型完整
- [ ] 能正常调用 Sidecar API

---

#### P1-W4-03: Zustand Store

**目标**: 创建全局状态管理

**apps/desktop/src/stores/appStore.ts**:
```typescript
import { create } from 'zustand';
import api from '../lib/api';
import type { CredentialStatus, SandboxInfo, SandboxConfig } from '@anycode/shared';

interface AppState {
  // 状态
  credentialStatus: CredentialStatus | null;
  dockerConnected: boolean;
  sandboxes: SandboxInfo[];
  loading: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;
  checkCredentials: () => Promise<void>;
  checkDocker: () => Promise<void>;
  fetchSandboxes: () => Promise<void>;
  createSandbox: (config: SandboxConfig) => Promise<SandboxInfo>;
  destroySandbox: (containerId: string) => Promise<void>;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  credentialStatus: null,
  dockerConnected: false,
  sandboxes: [],
  loading: false,
  error: null,

  init: async () => {
    await Promise.all([
      get().checkCredentials(),
      get().checkDocker(),
      get().fetchSandboxes(),
    ]);
  },

  checkCredentials: async () => {
    try {
      const status = await api.credentials.getStatus();
      set({ credentialStatus: status });
    } catch (e) {
      set({ error: `凭证检查失败: ${e}` });
    }
  },

  checkDocker: async () => {
    try {
      const { connected } = await api.docker.checkStatus();
      set({ dockerConnected: connected });
    } catch (e) {
      set({ dockerConnected: false });
    }
  },

  fetchSandboxes: async () => {
    set({ loading: true });
    try {
      const sandboxes = await api.sandbox.list();
      set({ sandboxes, loading: false });
    } catch (e) {
      set({ loading: false, error: `获取 Sandbox 列表失败: ${e}` });
    }
  },

  createSandbox: async (config) => {
    set({ loading: true });
    try {
      const sandbox = await api.sandbox.create(config);
      set((state) => ({
        sandboxes: [...state.sandboxes, sandbox],
        loading: false,
      }));
      return sandbox;
    } catch (e) {
      set({ loading: false, error: `创建 Sandbox 失败: ${e}` });
      throw e;
    }
  },

  destroySandbox: async (containerId) => {
    set({ loading: true });
    try {
      await api.sandbox.destroy(containerId);
      set((state) => ({
        sandboxes: state.sandboxes.filter((s) => s.containerId !== containerId),
        loading: false,
      }));
    } catch (e) {
      set({ loading: false, error: `删除 Sandbox 失败: ${e}` });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
```

**验收标准**:
- [ ] 状态管理正常工作
- [ ] 错误处理完善

---

#### P1-W4-04: 首页组件

**目标**: 实现首页基础 UI

**apps/desktop/src/App.tsx**:
```typescript
import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';

function App() {
  const {
    credentialStatus,
    dockerConnected,
    sandboxes,
    loading,
    error,
    init,
    createSandbox,
    destroySandbox,
    clearError,
  } = useAppStore();

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">AnyCode</h1>

      {/* 状态卡片 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-sm text-gray-500 mb-1">Claude Code</h3>
          <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${
            credentialStatus?.loggedIn
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {credentialStatus?.loggedIn ? '已连接' : '未登录'}
          </span>
          {credentialStatus?.isExpiringSoon && (
            <p className="text-xs text-yellow-600 mt-1">凭证即将过期</p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-sm text-gray-500 mb-1">Docker</h3>
          <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${
            dockerConnected
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {dockerConnected ? '已连接' : '未连接'}
          </span>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={clearError}
            className="text-sm text-red-500 underline mt-1"
          >
            关闭
          </button>
        </div>
      )}

      {/* Sandbox 列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Sandboxes</h2>
          <button
            onClick={() => createSandbox({
              projectId: 'test',
              projectPath: '/tmp/test',
            })}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            新建 Sandbox
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : sandboxes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无 Sandbox</div>
        ) : (
          <ul className="divide-y">
            {sandboxes.map((sandbox) => (
              <li key={sandbox.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{sandbox.name}</p>
                  <p className="text-sm text-gray-500">
                    {sandbox.status} · {sandbox.containerId.slice(0, 12)}
                  </p>
                </div>
                <button
                  onClick={() => destroySandbox(sandbox.containerId)}
                  className="text-red-500 hover:text-red-700"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
```

**验收标准**:
- [ ] 首页正确显示
- [ ] 状态卡片显示正确
- [ ] Sandbox 列表正常工作

---

#### P1-W4-05: Sandbox Docker 镜像

**目标**: 构建 Sandbox 基础镜像

**packages/sandbox-image/Dockerfile**:
```dockerfile
FROM ubuntu:22.04

LABEL maintainer="Jacky"
LABEL app="anycode-sandbox"

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8

# 基础工具
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git vim wget unzip \
    build-essential python3 python3-pip openssh-client jq \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

# 全局包
RUN npm install -g pnpm typescript @anthropic-ai/claude-code

# 工作用户
RUN useradd -m -s /bin/bash -u 1000 developer \
    && mkdir -p /workspace && chown -R developer:developer /workspace

USER developer
WORKDIR /workspace

HEALTHCHECK --interval=30s --timeout=10s CMD claude --version || exit 1
CMD ["/bin/bash"]
```

**构建命令**:
```bash
cd packages/sandbox-image
docker build -t anycode/sandbox:latest .
```

**验收标准**:
- [ ] 镜像构建成功
- [ ] Claude Code 可用

---

#### P1-W4-06: Phase 1 集成测试

**测试清单**:
```markdown
## Phase 1 验收测试

### Sidecar 服务
- [ ] `pnpm dev:sidecar` 启动成功
- [ ] `GET /health` 返回 ok
- [ ] `GET /api/credentials/status` 返回正确状态
- [ ] `GET /api/sandboxes/docker/status` 返回连接状态

### Docker 操作
- [ ] `POST /api/sandboxes` 创建容器成功
- [ ] `GET /api/sandboxes` 列出容器
- [ ] `DELETE /api/sandboxes/:id` 删除容器

### 桌面应用
- [ ] `pnpm tauri:dev` 启动成功
- [ ] 状态卡片显示正确
- [ ] Sandbox 列表正常
- [ ] 创建/删除 Sandbox 成功

### Sandbox 镜像
- [ ] 镜像构建成功
- [ ] `claude --version` 可用
```

---

## 任务进度追踪

| 任务 ID | 任务名称 | 状态 |
|---------|----------|------|
| P1-W1-01 | 创建 Monorepo 结构 | ⬜ |
| P1-W1-02 | 初始化 Sidecar 项目 | ⬜ |
| P1-W1-03 | Sidecar 入口和服务器 | ⬜ |
| P1-W1-04 | 共享类型包 | ⬜ |
| P1-W2-01 | 凭证服务基础结构 | ⬜ |
| P1-W2-02 | 凭证 API 路由 | ⬜ |
| P1-W3-01 | Docker 服务基础结构 | ⬜ |
| P1-W3-02 | Docker API 路由 | ⬜ |
| P1-W4-01 | 初始化 Tauri + React | ⬜ |
| P1-W4-02 | 前端 API 客户端 | ⬜ |
| P1-W4-03 | Zustand Store | ⬜ |
| P1-W4-04 | 首页组件 | ⬜ |
| P1-W4-05 | Sandbox Docker 镜像 | ⬜ |
| P1-W4-06 | Phase 1 集成测试 | ⬜ |

状态：⬜ 待开始 | 🔄 进行中 | ✅ 已完成

---

*文档版本: 2.0 (Node.js Sidecar 架构)*
*最后更新: 2026-01-28*
