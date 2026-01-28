# AnyCode - 多终端 Claude Code 编排平台

## 项目概述

AnyCode 是一个基于 Web 的平台，允许用户通过流式交互式终端管理多个 Claude Code 实例，每个实例运行在独立的 sandbox 环境中，可以并行处理不同的 Git 分支，并最终自动创建 PR 进行代码合并。

---

## 核心功能

### 1. 流式输入和交互式终端
- 基于 WebSocket 的实时双向通信
- 类似原生终端的输入输出体验
- 支持 ANSI 颜色和格式化输出
- 终端会话持久化和恢复

### 2. 一键导入 GitHub 项目
- GitHub OAuth 授权集成
- 支持公开和私有仓库
- 自动检测项目类型和依赖
- 快速克隆到指定 sandbox

### 3. 多 Sandbox 并行工作
- 每个任务运行在独立的 Docker 容器中
- 支持同时运行多个 Claude Code 实例
- 不同分支的并行开发
- 资源隔离和安全边界

### 4. PR 创建与合并
- 自动生成 PR 描述
- 代码变更预览
- 冲突检测和提示
- 一键合并工作流

### 5. OAuth 订阅集成
- 支持用户自带 Claude Pro/Max 订阅
- 安全的 OAuth 2.0 授权流程
- Token 刷新和管理
- 使用量追踪

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Web Frontend                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Terminal 1 │  │  Terminal 2 │  │  Terminal N │  │  Dashboard/Control  │ │
│  │  (xterm.js) │  │  (xterm.js) │  │  (xterm.js) │  │       Panel         │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────┼────────────────────┼────────────┘
          │ WebSocket      │ WebSocket      │ WebSocket          │ REST API
          ▼                ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway (Kong/Nginx)                          │
│                    - 路由分发  - 限流  - 认证  - 负载均衡                    │
└─────────────────────────────────────────────────────────────────────────────┘
          │                │                │                    │
          ▼                ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Core Services                                   │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   Auth Service   │  │  Session Manager │  │    Orchestrator Service   │  │
│  │                  │  │                  │  │                          │  │
│  │ - OAuth 2.0 流程 │  │ - 会话生命周期   │  │ - Sandbox 调度           │  │
│  │ - JWT 签发/验证  │  │ - 状态管理       │  │ - 任务分配               │  │
│  │ - 用户管理       │  │ - 心跳检测       │  │ - 并行控制               │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  GitHub Service  │  │ Terminal Service │  │      PR Service          │  │
│  │                  │  │                  │  │                          │  │
│  │ - 仓库操作       │  │ - PTY 管理       │  │ - PR 创建/更新           │  │
│  │ - Webhook 处理   │  │ - I/O 流转发     │  │ - 合并策略               │  │
│  │ - 分支管理       │  │ - 会话录制       │  │ - 状态同步               │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │                │                │                    │
          ▼                ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Sandbox Layer (Docker)                            │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Sandbox 1     │  │   Sandbox 2     │  │   Sandbox N     │            │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │            │
│  │  │Claude Code│  │  │  │Claude Code│  │  │  │Claude Code│  │            │
│  │  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │            │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │            │
│  │  │  Git Repo │  │  │  │  Git Repo │  │  │  │  Git Repo │  │            │
│  │  │ (branch-a)│  │  │  │ (branch-b)│  │  │  │ (branch-c)│  │            │
│  │  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                                      │
          ▼                                                      ▼
┌─────────────────────────────────┐  ┌────────────────────────────────────────┐
│         Data Layer              │  │           External Services            │
│  ┌─────────┐  ┌──────────────┐  │  │  ┌─────────┐  ┌───────────────────┐   │
│  │ PostgreSQL│  │    Redis    │  │  │  │ GitHub  │  │  Anthropic API    │   │
│  │ - 用户    │  │ - 会话缓存  │  │  │  │  API    │  │  (Claude)         │   │
│  │ - 项目    │  │ - 任务队列  │  │  │  └─────────┘  └───────────────────┘   │
│  │ - 历史    │  │ - Pub/Sub   │  │  │                                       │
│  └─────────┘  └──────────────┘  │  │                                       │
└─────────────────────────────────┘  └────────────────────────────────────────┘
```

---

## Claude Code 集成设计

这是系统的核心模块，详细描述如何与 Claude Code CLI 进行集成。

### 1. 认证方式分析

**重要发现**：Claude Code 将 OAuth 凭证存储在操作系统的安全存储中：
- **macOS**: Keychain (`Claude Code-credentials`)
- **Linux**: libsecret / GNOME Keyring
- **Windows**: Windows Credential Manager

这意味着我们可以复用用户已有的 Claude Code 认证，而无需单独的 API Key。

| 方式 | 描述 | 优先级 |
|------|------|--------|
| **本地凭证复用** | 读取用户本地 Claude Code 的 OAuth 凭证 | 高 - 推荐方式 |
| **API Key 直接配置** | 用户提供自己的 Anthropic API Key | 高 - 备选方式 |
| **本地代理模式** | 本地代理转发请求，凭证不离开本机 | 中 - 安全优先 |

### 2. 凭证复用方案详解

#### 方案 A：本地代理模式（最安全）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User's Local Machine                            │
│                                                                         │
│  ┌─────────────────┐       ┌─────────────────┐      ┌───────────────┐  │
│  │   AnyCode       │       │  Local Proxy    │      │   System      │  │
│  │   Desktop App   │──────>│  (Port 9876)    │─────>│   Keychain    │  │
│  │   or Browser    │       │                 │      │               │  │
│  └─────────────────┘       └────────┬────────┘      └───────────────┘  │
│                                     │                                   │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │ Authenticated
                                      │ API Calls
                                      ▼
                            ┌─────────────────┐
                            │  Anthropic API  │
                            │   (Claude)      │
                            └─────────────────┘
                                      ▲
                                      │ Proxied
                                      │ Requests
┌─────────────────────────────────────┼───────────────────────────────────┐
│                         Cloud Sandbox                                    │
│  ┌─────────────────┐       ┌────────┴────────┐                         │
│  │   Claude Code   │──────>│  Proxy Client   │                         │
│  │   (in sandbox)  │       │  (no credentials)│                         │
│  └─────────────────┘       └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘

优点：
- 凭证永远不离开用户本机
- 最高安全性
- 利用用户的 Pro/Max 订阅

缺点：
- 需要用户保持本地代理运行
- 网络延迟增加
```

#### 方案 B：凭证同步模式（便捷）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Credential Sync Flow                            │
│                                                                         │
│  1. User authorizes credential export                                   │
│     ┌─────────────────┐      ┌─────────────────┐                       │
│     │  AnyCode CLI    │─────>│  System Keychain│                       │
│     │  (local tool)   │      │  (with user OK) │                       │
│     └────────┬────────┘      └─────────────────┘                       │
│              │                                                          │
│  2. Encrypted upload                                                    │
│              │                                                          │
│              ▼                                                          │
│     ┌─────────────────┐      ┌─────────────────┐                       │
│     │  AnyCode Server │─────>│  Encrypted      │                       │
│     │                 │      │  Credential Store│                       │
│     └────────┬────────┘      └─────────────────┘                       │
│              │                                                          │
│  3. Inject into Sandbox                                                 │
│              │                                                          │
│              ▼                                                          │
│     ┌─────────────────┐                                                │
│     │  Sandbox        │                                                │
│     │  (credentials   │                                                │
│     │   in memory)    │                                                │
│     └─────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────────┘

优点：
- 一次同步，持续使用
- 无需保持本地服务运行
- 低延迟

缺点：
- 凭证需要上传到服务器（加密存储）
- 需要处理 token 刷新
```

#### 方案 C：本地 Sandbox 模式（推荐）

**这是 AnyCode 的主推方案**，结合了安全性和便捷性。

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      Local Sandbox Architecture (推荐方案)                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         User's Local Machine                            │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    AnyCode Desktop App (Tauri)                   │   │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │   │ │
│  │  │  │  Web UI     │  │  Tray Icon  │  │  Credential Manager     │ │   │ │
│  │  │  │  (WebView)  │  │  (状态显示) │  │  (keytar - Node.js)     │ │   │ │
│  │  │  └──────┬──────┘  └─────────────┘  └───────────┬─────────────┘ │   │ │
│  │  └─────────┼──────────────────────────────────────┼───────────────┘   │ │
│  │            │                                      │                    │ │
│  │            │ IPC                                  │ 凭证注入            │ │
│  │            ▼                                      ▼                    │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    Local Server (Node.js)                        │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │  │ │
│  │  │  │ Terminal WS  │  │  Docker API  │  │  Project Manager     │  │  │ │
│  │  │  │ (xterm)      │  │  (Sandbox)   │  │  (Git operations)    │  │  │ │
│  │  │  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │  │ │
│  │  └─────────┼─────────────────┼────────────────────────────────────┘  │ │
│  │            │                 │                                       │ │
│  │            │ PTY             │ Docker Socket                         │ │
│  │            ▼                 ▼                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐│ │
│  │  │                    Docker Container (Sandbox)                    ││ │
│  │  │                                                                  ││ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  ││ │
│  │  │  │ Claude Code  │  │  Git Repo    │  │  Dev Environment     │  ││ │
│  │  │  │ CLI          │  │  (workspace) │  │  (Node/Python/etc)   │  ││ │
│  │  │  └──────────────┘  └──────────────┘  └──────────────────────┘  ││ │
│  │  │                                                                  ││ │
│  │  │  环境变量 (运行时注入，不持久化):                                  ││ │
│  │  │  - ANTHROPIC_API_KEY=<from_keychain>                            ││ │
│  │  │  - GITHUB_TOKEN=<from_keychain>                                 ││ │
│  │  └──────────────────────────────────────────────────────────────────┘│ │
│  │                                                                       │ │
│  │  System Keychain (已有 Claude Code 登录):                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │  "Claude Code-credentials" → { access, refresh, expires }       │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Cloud Services (可选 - 用于同步和协作):                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 项目元数据   │  │ 工作流配置   │  │ 终端录制     │  │ 团队协作     │   │
│  │ 同步         │  │ 同步         │  │ 存储         │  │ (未来)       │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**数据流：**
1. 用户启动 AnyCode Desktop App
2. App 自动检测本地 Claude Code 登录状态（读取 Keychain）
3. 用户导入 GitHub 项目
4. App 创建 Docker Sandbox，将凭证作为环境变量注入
5. 用户通过 Web UI 与 Sandbox 中的 Claude Code 交互
6. 任务完成后，自动创建 PR

**安全特性：**
- 凭证只在内存中存在，不写入 Sandbox 磁盘
- Sandbox 销毁时凭证自动清除
- 定期检查凭证有效性，过期时提示重新登录

**优点：**
- 凭证完全本地，最高安全性
- 复用 Claude Pro/Max 订阅，无需额外付费
- 利用本地计算资源
- 可离线使用（基本功能）
- 无需手动配置 API Key

**缺点：**
- 需要本地安装 Docker
- 资源受限于本地机器

**系统要求：**
- macOS 12+ / Windows 10+ / Ubuntu 20.04+
- Docker Desktop 或 OrbStack
- 8GB+ RAM（推荐 16GB）
- 已登录 Claude Code CLI

### 3. Tauri + Node.js Sidecar 架构

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Tauri + Node.js Sidecar Architecture                       │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Frontend (WebView)                              │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    React + TypeScript                            │   │ │
│  │  │                                                                  │   │ │
│  │  │  Pages:                    Components:                           │   │ │
│  │  │  - /                       - TerminalPanel (xterm.js)           │   │ │
│  │  │  - /projects               - FileTree                           │   │ │
│  │  │  - /projects/:id           - TaskProgress                       │   │ │
│  │  │  - /settings               - DiffViewer                         │   │ │
│  │  │                                                                  │   │ │
│  │  │  API Calls (via HTTP/WebSocket to Sidecar):                     │   │ │
│  │  │  - fetch('/api/credentials')                                    │   │ │
│  │  │  - fetch('/api/sandboxes', { method: 'POST' })                  │   │ │
│  │  │  - WebSocket: ws://localhost:19876/ws/terminals/:id             │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      │ HTTP / WebSocket                      │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    Node.js Sidecar (localhost:19876)                   │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐    │ │
│  │  │ Credential Mgr  │  │  Docker Manager │  │  Terminal Manager   │    │ │
│  │  │                 │  │                 │  │                     │    │ │
│  │  │ - keytar        │  │ - dockerode     │  │ - node-pty          │    │ │
│  │  │ - 读取 Keychain │  │ - 容器生命周期  │  │ - PTY 会话管理      │    │ │
│  │  │ - Token 刷新    │  │ - 镜像管理      │  │ - WebSocket 通信    │    │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘    │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐    │ │
│  │  │  Git Manager    │  │  Project Store  │  │  HTTP/WS Server     │    │ │
│  │  │                 │  │                 │  │                     │    │ │
│  │  │ - simple-git    │  │ - better-sqlite3│  │ - fastify           │    │ │
│  │  │ - Clone/Pull    │  │ - 项目元数据    │  │ - @fastify/websocket│    │ │
│  │  │ - Branch/PR     │  │ - 配置存储      │  │ - 终端实时通信      │    │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      │ Sidecar spawn                         │
│                                      │                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    Tauri Shell (Rust - minimal)                        │ │
│  │                                                                         │ │
│  │  main.rs:                                                              │ │
│  │  - 启动 Node.js Sidecar                                                │ │
│  │  - 窗口管理                                                            │ │
│  │  - 系统托盘                                                            │ │
│  │  - 退出时清理 Sidecar                                                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Tauri + Node.js Sidecar vs Electron 对比：**

| 特性 | Tauri + Sidecar | Electron |
|------|-----------------|----------|
| 安装包大小 | ~15MB (含 Node.js) | ~150MB |
| 内存占用 | ~80MB | ~300MB |
| 开发效率 | 高（Node.js 生态） | 高 |
| Keychain 访问 | keytar (Node.js) | keytar |
| 启动速度 | 快 | 较慢 |
| 原生能力 | Sidecar 处理 | 直接 Node.js |

**核心 Node.js 依赖：**

```json
// apps/desktop/sidecar/package.json
{
  "name": "@anycode/sidecar",
  "version": "1.0.0",
  "type": "module",
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
  }
}
```

**Tauri 最小化配置（仅 Sidecar 启动）：**

```rust
// src-tauri/src/main.rs
use tauri::Manager;
use std::process::{Child, Command};

struct SidecarState(std::sync::Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 启动 Node.js Sidecar
            let sidecar_path = app.path_resolver()
                .resolve_resource("sidecar/index.js")
                .expect("failed to resolve sidecar");

            let child = Command::new("node")
                .arg(sidecar_path)
                .spawn()
                .expect("failed to start sidecar");

            app.manage(SidecarState(std::sync::Mutex::new(Some(child))));
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                // 关闭 Sidecar
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

### 4. 凭证读取实现（参考 moltbot）

基于对 [moltbot](https://github.com/moltbot/moltbot) 项目的分析，Claude Code 凭证的读取方式如下：

```typescript
// packages/credential-reader/src/index.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

interface ClaudeCredentials {
  access: string;       // OAuth access token
  refresh?: string;     // OAuth refresh token
  expires?: number;     // 过期时间戳 (Unix timestamp)
}

// 凭证缓存
interface CredentialCache {
  credentials: ClaudeCredentials | null;
  readAt: number;
  ttl: number;
}

class ClaudeCredentialReader {
  private static readonly KEYCHAIN_SERVICE = 'Claude Code-credentials';
  private static readonly CREDENTIAL_FILE = '.credentials.json';
  private static readonly DEFAULT_TTL = 60 * 1000;  // 1 分钟缓存

  private cache: CredentialCache | null = null;

  /**
   * 读取 Claude Code 凭证（带缓存）
   * 优先级：Keychain > 文件
   */
  async readCredentials(ttl = ClaudeCredentialReader.DEFAULT_TTL): Promise<ClaudeCredentials | null> {
    // 检查缓存
    if (this.cache && Date.now() - this.cache.readAt < ttl) {
      return this.cache.credentials;
    }

    let credentials: ClaudeCredentials | null = null;

    // 1. 尝试从 Keychain 读取 (macOS)
    if (process.platform === 'darwin') {
      credentials = await this.readFromKeychain();
    }

    // 2. 如果 Keychain 失败，尝试从文件读取
    if (!credentials) {
      credentials = await this.readFromFile();
    }

    // 更新缓存
    this.cache = {
      credentials,
      readAt: Date.now(),
      ttl,
    };

    return credentials;
  }

  /**
   * 从 macOS Keychain 读取凭证
   * 使用 security 命令行工具
   */
  private async readFromKeychain(): Promise<ClaudeCredentials | null> {
    try {
      const { stdout } = await execAsync(
        `security find-generic-password -s "${ClaudeCredentialReader.KEYCHAIN_SERVICE}" -w 2>/dev/null`
      );

      const parsed = JSON.parse(stdout.trim());
      return this.normalizeCredentials(parsed);
    } catch {
      // Keychain 访问失败（可能需要用户授权或不存在）
      return null;
    }
  }

  /**
   * 从文件读取凭证
   * 位置：~/.claude/.credentials.json
   */
  private async readFromFile(): Promise<ClaudeCredentials | null> {
    try {
      const credentialPath = path.join(
        os.homedir(),
        '.claude',
        ClaudeCredentialReader.CREDENTIAL_FILE
      );

      const content = await fs.readFile(credentialPath, 'utf-8');
      const parsed = JSON.parse(content);

      // 如果文件没有过期时间，根据文件修改时间估算（1小时后过期）
      if (!parsed.expires) {
        const stat = await fs.stat(credentialPath);
        parsed.expires = Math.floor(stat.mtimeMs / 1000) + 3600;
      }

      return this.normalizeCredentials(parsed);
    } catch {
      return null;
    }
  }

  /**
   * 标准化凭证格式
   */
  private normalizeCredentials(raw: any): ClaudeCredentials | null {
    if (!raw?.access && !raw?.accessToken) {
      return null;
    }

    return {
      access: raw.access || raw.accessToken,
      refresh: raw.refresh || raw.refreshToken,
      expires: raw.expires || raw.expiresAt,
    };
  }

  /**
   * 检查凭证是否过期
   * 提前 5 分钟视为过期，避免边界情况
   */
  isExpired(creds: ClaudeCredentials): boolean {
    if (!creds.expires) {
      return false;  // 没有过期时间，假设有效
    }
    const bufferMs = 5 * 60 * 1000;  // 5 分钟缓冲
    return Date.now() > (creds.expires * 1000 - bufferMs);
  }

  /**
   * 写入凭证到 Keychain（用于同步更新）
   */
  async writeToKeychain(creds: ClaudeCredentials): Promise<boolean> {
    if (process.platform !== 'darwin') {
      return false;
    }

    try {
      const value = JSON.stringify(creds);
      // 先删除旧的
      await execAsync(
        `security delete-generic-password -s "${ClaudeCredentialReader.KEYCHAIN_SERVICE}" 2>/dev/null || true`
      );
      // 添加新的
      await execAsync(
        `security add-generic-password -s "${ClaudeCredentialReader.KEYCHAIN_SERVICE}" -w '${value}'`
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = null;
  }
}

export { ClaudeCredentialReader, ClaudeCredentials };
```

### 4. 凭证同步机制（参考 moltbot 的 external-cli-sync）

```typescript
// packages/credential-sync/src/sync.ts

import { ClaudeCredentialReader, ClaudeCredentials } from '@anycode/credential-reader';

interface SyncResult {
  synced: boolean;
  credentials: ClaudeCredentials | null;
  reason?: string;
}

class CredentialSyncManager {
  private reader: ClaudeCredentialReader;
  private lastSyncedCredentials: ClaudeCredentials | null = null;

  constructor() {
    this.reader = new ClaudeCredentialReader();
  }

  /**
   * 同步外部 CLI 凭证到系统
   * 只在凭证变化或过期时同步，减少开销
   */
  async syncFromExternalCli(ttl?: number): Promise<SyncResult> {
    const credentials = await this.reader.readCredentials(ttl);

    // 无凭证
    if (!credentials) {
      return {
        synced: false,
        credentials: null,
        reason: 'no_credentials_found',
      };
    }

    // 检查是否需要同步
    const needsSync = this.shouldSync(credentials);

    if (!needsSync) {
      return {
        synced: false,
        credentials: this.lastSyncedCredentials,
        reason: 'no_changes',
      };
    }

    // 执行同步
    this.lastSyncedCredentials = credentials;

    return {
      synced: true,
      credentials,
      reason: this.reader.isExpired(credentials) ? 'refreshed' : 'updated',
    };
  }

  /**
   * 判断是否需要同步
   */
  private shouldSync(newCreds: ClaudeCredentials): boolean {
    // 没有之前的凭证，需要同步
    if (!this.lastSyncedCredentials) {
      return true;
    }

    // 之前的凭证过期了，需要同步
    if (this.reader.isExpired(this.lastSyncedCredentials)) {
      return true;
    }

    // 凭证内容变化了，需要同步
    return !this.credentialsEqual(this.lastSyncedCredentials, newCreds);
  }

  /**
   * 比较两个凭证是否相同
   */
  private credentialsEqual(a: ClaudeCredentials, b: ClaudeCredentials): boolean {
    return (
      a.access === b.access &&
      a.refresh === b.refresh &&
      a.expires === b.expires
    );
  }
}

export { CredentialSyncManager, SyncResult };
```

### 4. 本地代理服务实现

```typescript
// packages/local-proxy/src/server.ts

import Fastify from 'fastify';
import { CredentialReader } from '@anycode/credential-reader';

const app = Fastify();
const credentialReader = new CredentialReader();

// 缓存的凭证
let cachedCredentials: ClaudeCredentials | null = null;

// 代理 Claude API 请求
app.all('/v1/*', async (request, reply) => {
  // 获取或刷新凭证
  if (!cachedCredentials || isExpired(cachedCredentials)) {
    cachedCredentials = await credentialReader.readLocalCredentials();

    if (!cachedCredentials) {
      return reply.status(401).send({
        error: 'No Claude credentials found. Please login to Claude Code first.',
      });
    }
  }

  // 转发请求到 Anthropic API
  const targetUrl = `https://api.anthropic.com${request.url}`;

  const response = await fetch(targetUrl, {
    method: request.method as string,
    headers: {
      ...request.headers,
      'Authorization': `Bearer ${cachedCredentials.accessToken}`,
      'anthropic-version': '2024-01-01',
    },
    body: request.method !== 'GET' ? JSON.stringify(request.body) : undefined,
  });

  // 流式响应处理
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');

    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply.raw.write(value);
      }
    }
    reply.raw.end();
  } else {
    reply.status(response.status).send(await response.json());
  }
});

// 健康检查
app.get('/health', async () => {
  const hasCredentials = await credentialReader.readLocalCredentials();
  return {
    status: hasCredentials ? 'ok' : 'no_credentials',
    version: '1.0.0',
  };
});

// 启动服务
app.listen({ port: 9876, host: '127.0.0.1' }, (err, address) => {
  if (err) throw err;
  console.log(`Local proxy running at ${address}`);
});
```

### 2. Sandbox 内 Claude Code 通信架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Host System                                    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      Terminal Service                               │ │
│  │                                                                     │ │
│  │   ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐    │ │
│  │   │  WebSocket  │───>│  PTY Manager │───>│  Stream Processor │    │ │
│  │   │   Handler   │<───│              │<───│                   │    │ │
│  │   └─────────────┘    └──────────────┘    └───────────────────┘    │ │
│  │                              │                      │              │ │
│  │                              │ stdin/stdout         │ events       │ │
│  │                              ▼                      ▼              │ │
│  └──────────────────────────────┼──────────────────────┼──────────────┘ │
│                                 │                      │                │
│  ┌──────────────────────────────┼──────────────────────┼──────────────┐ │
│  │                    Docker Container (Sandbox)       │              │ │
│  │                              │                      │              │ │
│  │   ┌──────────────────────────▼──────────────────────▼────────────┐ │ │
│  │   │                    Sandbox Agent                              │ │ │
│  │   │                                                               │ │ │
│  │   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │ │ │
│  │   │  │ PTY Slave   │    │   Claude    │    │  Event Reporter │  │ │ │
│  │   │  │ (bash/zsh)  │───>│   Code CLI  │───>│  (status/prog)  │  │ │ │
│  │   │  └─────────────┘    └─────────────┘    └─────────────────┘  │ │ │
│  │   │                            │                                  │ │ │
│  │   │                            │ API calls                        │ │ │
│  │   │                            ▼                                  │ │ │
│  │   │                    ┌─────────────────┐                       │ │ │
│  │   │                    │  Claude API     │                       │ │ │
│  │   │                    │  (via env key)  │                       │ │ │
│  │   │                    └─────────────────┘                       │ │ │
│  │   └───────────────────────────────────────────────────────────────┘ │ │
│  │                                                                     │ │
│  │   Environment Variables:                                           │ │
│  │   - ANTHROPIC_API_KEY=${user_api_key}                             │ │
│  │   - CLAUDE_CODE_USE_BEDROCK=false                                 │ │
│  │   - GITHUB_TOKEN=${github_token}                                  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Sandbox Agent 设计

Sandbox Agent 是运行在容器内的守护进程，负责管理 Claude Code 生命周期：

```typescript
// packages/sandbox-agent/src/agent.ts

interface SandboxAgent {
  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;

  // Claude Code 管理
  spawnClaudeCode(config: ClaudeCodeConfig): Promise<ClaudeCodeProcess>;
  sendInput(processId: string, data: string): void;
  interrupt(processId: string): void;

  // 状态上报
  reportStatus(status: SandboxStatus): void;
  reportProgress(taskId: string, progress: TaskProgress): void;
}

interface ClaudeCodeConfig {
  workDir: string;
  prompt?: string;           // 初始 prompt
  allowedTools?: string[];   // 允许的工具
  maxTurns?: number;         // 最大对话轮数
  timeout?: number;          // 超时时间
}

interface ClaudeCodeProcess {
  id: string;
  pid: number;
  status: 'starting' | 'running' | 'waiting_input' | 'completed' | 'error';

  // 事件
  onOutput: (data: string) => void;
  onStatusChange: (status: string) => void;
  onToolUse: (tool: string, input: any) => void;
  onComplete: (result: any) => void;
  onError: (error: Error) => void;
}
```

### 4. 流式输出处理

```typescript
// 流式输出处理器
class StreamProcessor {
  private buffer: string = '';
  private ansiParser: AnsiParser;

  constructor(private ws: WebSocket) {
    this.ansiParser = new AnsiParser();
  }

  // 处理 Claude Code 输出
  processOutput(chunk: Buffer): void {
    const text = chunk.toString('utf-8');

    // 解析 ANSI 转义序列
    const parsed = this.ansiParser.parse(text);

    // 检测特殊事件（工具调用、思考过程等）
    const events = this.detectEvents(parsed);

    // 发送到前端
    this.ws.send(JSON.stringify({
      type: 'output',
      payload: {
        data: text,
        events: events,
      },
      timestamp: Date.now(),
    }));
  }

  // 检测 Claude Code 特殊事件
  private detectEvents(text: string): OutputEvent[] {
    const events: OutputEvent[] = [];

    // 检测工具调用开始
    if (text.includes('Using tool:')) {
      events.push({ type: 'tool_start', tool: this.extractToolName(text) });
    }

    // 检测思考过程
    if (text.includes('Thinking...')) {
      events.push({ type: 'thinking' });
    }

    // 检测文件编辑
    if (text.includes('Editing file:')) {
      events.push({ type: 'file_edit', file: this.extractFileName(text) });
    }

    return events;
  }
}
```

### 5. Claude Code 配置注入

```typescript
// 启动 Sandbox 时注入配置
async function createSandboxWithClaude(
  userId: string,
  projectId: string,
  config: SandboxConfig
): Promise<Sandbox> {
  // 获取用户的 API Key（加密存储）
  const credentials = await getDecryptedCredentials(userId, 'anthropic');

  // 创建容器
  const container = await docker.createContainer({
    Image: 'anycode/sandbox:latest',
    Env: [
      `ANTHROPIC_API_KEY=${credentials.apiKey}`,
      `GITHUB_TOKEN=${credentials.githubToken}`,
      `SANDBOX_ID=${config.sandboxId}`,
      `USER_ID=${userId}`,
      // Claude Code 配置
      `CLAUDE_CODE_TELEMETRY=false`,
      `CLAUDE_CODE_AUTO_APPROVE=false`,  // 安全：不自动批准危险操作
    ],
    HostConfig: {
      Memory: config.memoryLimit,
      NanoCpus: config.cpuLimit * 1e9,
      SecurityOpt: ['no-new-privileges'],
      CapDrop: ['ALL'],
      CapAdd: ['CHOWN', 'SETUID', 'SETGID'],  // 最小权限
    },
  });

  return container;
}
```

---

## 详细设计

### 1. 认证与授权模块

#### 1.1 OAuth 2.0 流程

```
┌──────────┐                              ┌──────────┐                    ┌──────────┐
│  用户    │                              │ AnyCode  │                    │Anthropic │
│ Browser  │                              │  Server  │                    │  OAuth   │
└────┬─────┘                              └────┬─────┘                    └────┬─────┘
     │                                         │                               │
     │  1. 点击 "使用 Claude 订阅登录"          │                               │
     │────────────────────────────────────────>│                               │
     │                                         │                               │
     │  2. 重定向到 Anthropic OAuth            │                               │
     │<────────────────────────────────────────│                               │
     │                                         │                               │
     │  3. 用户授权                            │                               │
     │─────────────────────────────────────────────────────────────────────────>
     │                                         │                               │
     │  4. 返回授权码                          │                               │
     │<─────────────────────────────────────────────────────────────────────────
     │                                         │                               │
     │  5. 携带授权码回调                       │                               │
     │────────────────────────────────────────>│                               │
     │                                         │                               │
     │                                         │  6. 交换 access_token         │
     │                                         │──────────────────────────────>│
     │                                         │                               │
     │                                         │  7. 返回 token                │
     │                                         │<──────────────────────────────│
     │                                         │                               │
     │  8. 登录成功，返回 JWT                   │                               │
     │<────────────────────────────────────────│                               │
     │                                         │                               │
```

#### 1.2 数据模型

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- OAuth 凭证表
CREATE TABLE oauth_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- 'anthropic', 'github'
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    scopes TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- API 密钥表（可选的直接 API key 方式）
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash
    key_prefix VARCHAR(8) NOT NULL,  -- 用于显示 "sk-...xxxx"
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2. 终端服务模块

#### 2.1 WebSocket 协议设计

**连接建立:**
```
wss://api.anycode.jacky.cn/terminal/{session_id}?token={jwt_token}
```

**消息格式:**
```typescript
// 客户端 -> 服务端
interface ClientMessage {
  type: 'input' | 'resize' | 'ping' | 'command';
  payload: {
    // input 类型
    data?: string;  // 用户输入的字符

    // resize 类型
    cols?: number;
    rows?: number;

    // command 类型
    command?: 'interrupt' | 'kill' | 'restart';
  };
  timestamp: number;
}

// 服务端 -> 客户端
interface ServerMessage {
  type: 'output' | 'status' | 'error' | 'pong';
  payload: {
    // output 类型
    data?: string;  // PTY 输出

    // status 类型
    status?: 'connecting' | 'ready' | 'busy' | 'disconnected';

    // error 类型
    code?: string;
    message?: string;
  };
  timestamp: number;
}
```

#### 2.2 PTY 管理

```typescript
interface PTYSession {
  id: string;
  sandboxId: string;
  userId: string;

  // PTY 配置
  shell: string;  // '/bin/bash'
  cwd: string;    // 工作目录
  env: Record<string, string>;

  // 终端尺寸
  cols: number;
  rows: number;

  // 状态
  status: 'pending' | 'running' | 'terminated';
  createdAt: Date;
  lastActivityAt: Date;
}
```

---

### 3. Sandbox 管理模块

#### 3.1 Sandbox 生命周期

```
┌─────────────────────────────────────────────────────────────────┐
│                      Sandbox Lifecycle                          │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Pending  │───>│ Creating │───>│  Ready   │───>│ Running  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │                               │               │         │
│       │                               │               │         │
│       ▼                               ▼               ▼         │
│  ┌──────────┐                   ┌──────────┐    ┌──────────┐   │
│  │  Failed  │                   │  Paused  │───>│ Stopped  │   │
│  └──────────┘                   └──────────┘    └──────────┘   │
│                                                      │          │
│                                                      ▼          │
│                                                ┌──────────┐    │
│                                                │ Destroyed│    │
│                                                └──────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.2 Docker 容器配置

```yaml
# sandbox-template.yaml
version: '3.8'
services:
  sandbox:
    image: anycode/sandbox:latest
    build:
      context: ./sandbox
      dockerfile: Dockerfile

    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 512M

    # 安全配置
    security_opt:
      - no-new-privileges:true
      - seccomp:sandbox-seccomp.json

    # 网络隔离
    networks:
      - sandbox-network

    # 挂载卷
    volumes:
      - type: volume
        source: workspace-${SANDBOX_ID}
        target: /workspace
      - type: bind
        source: /var/run/docker.sock
        target: /var/run/docker.sock
        read_only: true

    # 环境变量
    environment:
      - SANDBOX_ID=${SANDBOX_ID}
      - USER_ID=${USER_ID}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
```

#### 3.3 Sandbox Dockerfile

```dockerfile
FROM ubuntu:22.04

# 基础工具
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    vim \
    build-essential \
    python3 \
    python3-pip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# 安装 Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# 创建工作用户
RUN useradd -m -s /bin/bash developer
USER developer
WORKDIR /workspace

# 入口脚本
COPY --chown=developer:developer entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

---

### 4. 编排服务模块

#### 4.1 任务定义

```typescript
interface Task {
  id: string;
  projectId: string;
  userId: string;

  // 任务类型
  type: 'feature' | 'bugfix' | 'refactor' | 'review' | 'custom';

  // 任务描述
  title: string;
  description: string;
  prompt: string;  // 发送给 Claude 的具体指令

  // Git 配置
  git: {
    repository: string;
    baseBranch: string;
    targetBranch: string;
    autoPR: boolean;
  };

  // 分配的 Sandbox
  sandboxId?: string;

  // 状态
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed';
  progress: number;  // 0-100

  // 结果
  result?: {
    success: boolean;
    commits: string[];
    prUrl?: string;
    error?: string;
  };

  // 时间戳
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
```

#### 4.2 工作流引擎

```typescript
interface Workflow {
  id: string;
  name: string;
  projectId: string;

  // 工作流定义
  steps: WorkflowStep[];

  // 并行配置
  parallel: {
    enabled: boolean;
    maxConcurrent: number;
  };

  // 触发条件
  triggers: {
    manual: boolean;
    schedule?: string;  // cron 表达式
    webhook?: {
      events: string[];  // 'push', 'pull_request', etc.
    };
  };
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'claude_task' | 'git_operation' | 'shell_command' | 'wait' | 'approval';

  // 依赖关系
  dependsOn?: string[];  // 其他 step 的 id

  // 条件执行
  condition?: string;  // JavaScript 表达式

  // 步骤配置
  config: {
    // claude_task
    prompt?: string;
    branch?: string;

    // git_operation
    operation?: 'checkout' | 'merge' | 'push' | 'create_pr';

    // shell_command
    command?: string;

    // wait
    duration?: number;

    // approval
    approvers?: string[];
  };
}
```

#### 4.3 示例工作流：并行功能开发

```yaml
name: parallel-feature-development
description: 在多个分支上并行开发功能

steps:
  - id: setup
    name: 初始化项目
    type: git_operation
    config:
      operation: checkout
      branch: main

  - id: feature-auth
    name: 开发认证功能
    type: claude_task
    dependsOn: [setup]
    config:
      prompt: |
        实现用户认证功能：
        1. 创建登录/注册 API
        2. JWT token 管理
        3. 密码加密
      branch: feature/auth

  - id: feature-dashboard
    name: 开发仪表板
    type: claude_task
    dependsOn: [setup]
    config:
      prompt: |
        实现用户仪表板：
        1. 用户信息展示
        2. 活动统计图表
        3. 快捷操作入口
      branch: feature/dashboard

  - id: feature-settings
    name: 开发设置页面
    type: claude_task
    dependsOn: [setup]
    config:
      prompt: |
        实现系统设置页面：
        1. 用户偏好设置
        2. 通知配置
        3. API 密钥管理
      branch: feature/settings

  - id: create-prs
    name: 创建 PR
    type: git_operation
    dependsOn: [feature-auth, feature-dashboard, feature-settings]
    config:
      operation: create_pr
      branches: [feature/auth, feature/dashboard, feature/settings]
      targetBranch: develop
```

---

### 5. GitHub 集成模块

#### 5.1 API 接口

```typescript
// 项目导入
POST /api/github/import
{
  "repository": "owner/repo",
  "branch": "main",
  "shallow": true  // 是否浅克隆
}

// 创建 PR
POST /api/github/pull-requests
{
  "repository": "owner/repo",
  "title": "feat: Add user authentication",
  "body": "## Changes\n- Added login API\n- Added JWT support",
  "head": "feature/auth",
  "base": "main",
  "draft": false
}

// 合并 PR
POST /api/github/pull-requests/{pr_number}/merge
{
  "merge_method": "squash",  // 'merge' | 'squash' | 'rebase'
  "commit_title": "feat: Add user authentication (#123)",
  "delete_branch": true
}
```

#### 5.2 Webhook 处理

```typescript
// Webhook 事件处理器
interface WebhookHandler {
  // PR 事件
  onPullRequestOpened(event: PREvent): Promise<void>;
  onPullRequestClosed(event: PREvent): Promise<void>;
  onPullRequestReviewRequested(event: PREvent): Promise<void>;

  // Push 事件
  onPush(event: PushEvent): Promise<void>;

  // Issue 事件
  onIssueOpened(event: IssueEvent): Promise<void>;
  onIssueCommented(event: IssueEvent): Promise<void>;
}
```

---

### 6. API 端点设计

#### 6.1 RESTful API

```yaml
# API 端点概览

# 认证
POST   /api/auth/login          # 登录
POST   /api/auth/logout         # 登出
POST   /api/auth/refresh        # 刷新 token
GET    /api/auth/oauth/github   # GitHub OAuth
GET    /api/auth/oauth/anthropic # Anthropic OAuth

# 用户
GET    /api/users/me            # 获取当前用户
PUT    /api/users/me            # 更新用户信息
GET    /api/users/me/usage      # 获取使用量统计

# 项目
GET    /api/projects            # 项目列表
POST   /api/projects            # 创建项目
GET    /api/projects/:id        # 获取项目详情
PUT    /api/projects/:id        # 更新项目
DELETE /api/projects/:id        # 删除项目

# Sandbox
GET    /api/sandboxes           # Sandbox 列表
POST   /api/sandboxes           # 创建 Sandbox
GET    /api/sandboxes/:id       # 获取 Sandbox 详情
POST   /api/sandboxes/:id/start # 启动 Sandbox
POST   /api/sandboxes/:id/stop  # 停止 Sandbox
DELETE /api/sandboxes/:id       # 删除 Sandbox

# 终端
GET    /api/terminals           # 终端列表
POST   /api/terminals           # 创建终端
GET    /api/terminals/:id       # 获取终端详情
DELETE /api/terminals/:id       # 关闭终端
# WebSocket: /ws/terminals/:id  # 终端连接

# 任务
GET    /api/tasks               # 任务列表
POST   /api/tasks               # 创建任务
GET    /api/tasks/:id           # 获取任务详情
POST   /api/tasks/:id/cancel    # 取消任务
GET    /api/tasks/:id/logs      # 获取任务日志

# 工作流
GET    /api/workflows           # 工作流列表
POST   /api/workflows           # 创建工作流
GET    /api/workflows/:id       # 获取工作流详情
POST   /api/workflows/:id/run   # 执行工作流
GET    /api/workflows/:id/runs  # 工作流执行历史
```

#### 6.2 错误响应格式

```typescript
interface APIError {
  error: {
    code: string;      // 'UNAUTHORIZED', 'NOT_FOUND', etc.
    message: string;   // 人类可读的错误信息
    details?: any;     // 额外的错误详情
    requestId: string; // 请求追踪 ID
  };
}
```

---

## 技术栈选择

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Tauri + Node.js Sidecar 架构                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         Tauri Shell                              │   │
│  │  - 窗口管理                                                       │   │
│  │  - 系统托盘                                                       │   │
│  │  - 原生菜单                                                       │   │
│  │  - 启动 Node.js Sidecar                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                        │
│                                │ spawn                                  │
│                                ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Node.js Sidecar (核心服务)                     │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │ Credentials  │  │   Docker     │  │     Terminal         │  │   │
│  │  │  (keytar)    │  │ (dockerode)  │  │    (node-pty)        │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │     Git      │  │   Project    │  │    WebSocket         │  │   │
│  │  │ (simple-git) │  │   Manager    │  │     Server           │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │   │
│  │                                                                  │   │
│  │  HTTP Server (Fastify) on localhost:19876                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                        │
│                                │ HTTP / WebSocket                       │
│                                ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Frontend (WebView)                            │   │
│  │                    React + TypeScript                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Desktop App (Tauri + Node.js)
| 组件 | 技术选择 | 理由 |
|------|----------|------|
| 壳 | Tauri 2.0 | 轻量（~15MB 含 Node）、原生窗口 |
| 核心服务 | Node.js Sidecar | 开发快、生态丰富、可共享类型 |
| Keychain | keytar | 跨平台 Keychain 访问 |
| Docker | dockerode | 成熟的 Docker API 库 |
| PTY | node-pty | 跨平台伪终端 |
| Git | simple-git | 简洁的 Git 操作 |
| HTTP 服务 | Fastify | 高性能、TypeScript 友好 |
| WebSocket | ws | 终端实时通信 |
| 数据库 | better-sqlite3 | 本地嵌入式数据库 |

### 前端 (WebView)
| 组件 | 技术选择 | 理由 |
|------|----------|------|
| 框架 | React 18 + TypeScript | 成熟生态，组件化 |
| 状态管理 | Zustand | 轻量，简单易用 |
| 终端组件 | xterm.js | 功能完整的终端模拟器 |
| UI 组件 | shadcn/ui | 可定制，现代设计 |
| 构建工具 | Vite | 快速开发体验 |
| HTTP 客户端 | ky / fetch | 调用 Sidecar API |

### 共享代码
| 组件 | 位置 | 用途 |
|------|------|------|
| 类型定义 | packages/shared | 前后端共享 TypeScript 类型 |
| 工具函数 | packages/shared | 通用工具函数 |
| API 类型 | packages/shared | API 请求/响应类型 |

### 云端服务（可选）
| 组件 | 技术选择 | 理由 |
|------|----------|------|
| API 框架 | Node.js (Fastify) | 与 Sidecar 代码复用 |
| 数据库 | PostgreSQL | 可靠，功能丰富 |
| 缓存 | Redis | 高性能，支持 Pub/Sub |
| 对象存储 | MinIO / S3 | 存储终端录制、日志等 |

### 基础设施
| 组件 | 技术选择 | 理由 |
|------|----------|------|
| 容器运行时 | Docker / OrbStack | 标准化，OrbStack 更轻量 |
| 打包分发 | Tauri Bundler | 自动生成安装包 |
| 自动更新 | Tauri Updater | 内置更新机制 |
| Node 打包 | pkg / nexe | 将 Node.js 打包为二进制 |

---

## 数据库完整 Schema

```sql
-- 用户相关
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    plan VARCHAR(50) DEFAULT 'free',  -- 'free', 'pro', 'team'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE oauth_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    scopes TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- 项目相关
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url TEXT,
    default_branch VARCHAR(255) DEFAULT 'main',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sandbox 相关
CREATE TABLE sandboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    container_id VARCHAR(255),

    -- 资源配置
    cpu_limit DECIMAL(3,1) DEFAULT 2.0,
    memory_limit_mb INTEGER DEFAULT 4096,

    -- Git 状态
    current_branch VARCHAR(255),
    last_commit VARCHAR(40),

    -- 元数据
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    stopped_at TIMESTAMP
);

-- 终端会话
CREATE TABLE terminal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sandbox_id UUID REFERENCES sandboxes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- 终端配置
    shell VARCHAR(255) DEFAULT '/bin/bash',
    cols INTEGER DEFAULT 80,
    rows INTEGER DEFAULT 24,

    -- 状态
    status VARCHAR(50) DEFAULT 'pending',
    pid INTEGER,

    -- 录制
    recording_enabled BOOLEAN DEFAULT false,
    recording_url TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

-- 任务
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    sandbox_id UUID REFERENCES sandboxes(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- 任务信息
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    prompt TEXT,

    -- Git 配置
    base_branch VARCHAR(255),
    target_branch VARCHAR(255),

    -- 状态
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,

    -- 结果
    result JSONB,
    error TEXT,

    -- PR 信息
    pr_number INTEGER,
    pr_url TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 工作流
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,  -- 工作流步骤定义

    -- 触发配置
    triggers JSONB DEFAULT '{}',

    -- 状态
    enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- 执行状态
    status VARCHAR(50) DEFAULT 'pending',
    current_step VARCHAR(255),

    -- 结果
    result JSONB,

    -- 时间
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- 使用量统计
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- 使用类型
    type VARCHAR(50) NOT NULL,  -- 'api_call', 'sandbox_time', 'storage'

    -- 用量
    amount DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,  -- 'tokens', 'minutes', 'bytes'

    -- 关联
    resource_type VARCHAR(50),
    resource_id UUID,

    recorded_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_sandboxes_user_id ON sandboxes(user_id);
CREATE INDEX idx_sandboxes_status ON sandboxes(status);
CREATE INDEX idx_terminal_sessions_sandbox_id ON terminal_sessions(sandbox_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_recorded_at ON usage_records(recorded_at);
```

---

## 监控与可观测性

### 1. 日志系统

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Log Architecture                                 │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐│
│  │  API Logs   │  │Terminal Logs│  │ Sandbox Logs│  │ Claude Code Logs││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────┬─────────┘│
│         │                │                │                  │          │
│         └────────────────┴────────────────┴──────────────────┘          │
│                                   │                                      │
│                                   ▼                                      │
│                        ┌─────────────────────┐                          │
│                        │   Vector / Fluent   │                          │
│                        │   (Log Collector)   │                          │
│                        └──────────┬──────────┘                          │
│                                   │                                      │
│                    ┌──────────────┼──────────────┐                      │
│                    ▼              ▼              ▼                      │
│             ┌──────────┐   ┌──────────┐   ┌──────────┐                 │
│             │ Loki     │   │ S3/MinIO │   │ ClickHouse│                 │
│             │(实时查询) │   │ (归档)   │   │ (分析)    │                 │
│             └──────────┘   └──────────┘   └──────────┘                 │
│                    │                             │                      │
│                    └─────────────┬───────────────┘                      │
│                                  ▼                                      │
│                           ┌──────────┐                                  │
│                           │ Grafana  │                                  │
│                           │(可视化)   │                                  │
│                           └──────────┘                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. 结构化日志格式

```typescript
interface LogEntry {
  // 基础字段
  timestamp: string;        // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;

  // 追踪字段
  traceId: string;          // 分布式追踪 ID
  spanId: string;
  parentSpanId?: string;

  // 上下文字段
  service: string;          // 'api' | 'terminal' | 'sandbox' | 'worker'
  userId?: string;
  sandboxId?: string;
  sessionId?: string;
  taskId?: string;

  // 错误字段
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };

  // 性能字段
  duration?: number;        // 毫秒
  metadata?: Record<string, any>;
}
```

### 3. 指标监控 (Prometheus)

```yaml
# 核心指标定义

# API 指标
- name: http_requests_total
  type: counter
  labels: [method, path, status]

- name: http_request_duration_seconds
  type: histogram
  labels: [method, path]
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]

# WebSocket 指标
- name: websocket_connections_active
  type: gauge
  labels: [type]  # terminal, event

- name: websocket_messages_total
  type: counter
  labels: [direction, type]  # in/out, input/output/status

# Sandbox 指标
- name: sandbox_instances_total
  type: gauge
  labels: [status]  # pending, running, stopped

- name: sandbox_cpu_usage_percent
  type: gauge
  labels: [sandbox_id]

- name: sandbox_memory_usage_bytes
  type: gauge
  labels: [sandbox_id]

- name: sandbox_lifecycle_duration_seconds
  type: histogram
  labels: [operation]  # create, start, stop, destroy

# Claude Code 指标
- name: claude_api_requests_total
  type: counter
  labels: [model, status]

- name: claude_api_tokens_total
  type: counter
  labels: [type]  # input, output

- name: claude_task_duration_seconds
  type: histogram
  labels: [task_type]

# 任务队列指标
- name: queue_jobs_total
  type: counter
  labels: [queue, status]

- name: queue_jobs_waiting
  type: gauge
  labels: [queue]

- name: queue_job_duration_seconds
  type: histogram
  labels: [queue]
```

### 4. 分布式追踪 (OpenTelemetry)

```typescript
// 追踪配置
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  serviceName: 'anycode-api',
  traceExporter: new OTLPTraceExporter({
    url: 'http://tempo:4318/v1/traces',
  }),
});

// 关键操作追踪示例
async function createSandbox(ctx: Context, config: SandboxConfig) {
  return tracer.startActiveSpan('sandbox.create', async (span) => {
    span.setAttribute('user.id', ctx.userId);
    span.setAttribute('project.id', config.projectId);

    try {
      // 创建容器
      const container = await tracer.startActiveSpan('docker.create', async (s) => {
        const c = await docker.createContainer(config);
        s.setAttribute('container.id', c.id);
        return c;
      });

      // 启动容器
      await tracer.startActiveSpan('docker.start', async () => {
        await container.start();
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return container;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    }
  });
}
```

### 5. 告警规则

```yaml
# alerting-rules.yaml
groups:
  - name: anycode-alerts
    rules:
      # API 高延迟
      - alert: APIHighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API 响应延迟过高"
          description: "P95 延迟超过 2 秒，当前值: {{ $value }}s"

      # Sandbox 创建失败率
      - alert: SandboxCreateFailureHigh
        expr: |
          sum(rate(sandbox_lifecycle_duration_seconds_count{operation="create",status="error"}[5m]))
          / sum(rate(sandbox_lifecycle_duration_seconds_count{operation="create"}[5m])) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Sandbox 创建失败率过高"

      # Claude API 错误率
      - alert: ClaudeAPIErrorHigh
        expr: |
          sum(rate(claude_api_requests_total{status=~"5.."}[5m]))
          / sum(rate(claude_api_requests_total[5m])) > 0.05
        for: 3m
        labels:
          severity: critical

      # WebSocket 连接数异常
      - alert: WebSocketConnectionsDrop
        expr: |
          (websocket_connections_active - websocket_connections_active offset 5m)
          / websocket_connections_active offset 5m < -0.5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "WebSocket 连接数大幅下降"

      # 任务队列积压
      - alert: QueueBacklogHigh
        expr: queue_jobs_waiting > 100
        for: 10m
        labels:
          severity: warning
```

---

## 错误处理与容错

### 1. 错误分类与处理策略

```typescript
// 错误类型定义
enum ErrorCode {
  // 客户端错误 (4xx)
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // 服务端错误 (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',

  // 外部服务错误
  CLAUDE_API_ERROR = 'CLAUDE_API_ERROR',
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  DOCKER_ERROR = 'DOCKER_ERROR',

  // Sandbox 错误
  SANDBOX_CREATE_FAILED = 'SANDBOX_CREATE_FAILED',
  SANDBOX_TIMEOUT = 'SANDBOX_TIMEOUT',
  SANDBOX_OOM = 'SANDBOX_OOM',
}

// 错误处理策略
const errorStrategies: Record<ErrorCode, ErrorStrategy> = {
  [ErrorCode.CLAUDE_API_ERROR]: {
    retry: true,
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 1000,
    notify: true,
  },
  [ErrorCode.SANDBOX_OOM]: {
    retry: false,
    notify: true,
    cleanup: true,
    userMessage: 'Sandbox 内存不足，请尝试减小任务规模',
  },
  [ErrorCode.RATE_LIMITED]: {
    retry: true,
    maxRetries: 5,
    backoff: 'exponential',
    initialDelay: 5000,
    respectRetryAfter: true,
  },
};
```

### 2. 重试机制

```typescript
class RetryHandler {
  async execute<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // 检查是否可重试
        if (!this.isRetryable(error, config)) {
          throw error;
        }

        // 最后一次尝试不再重试
        if (attempt === config.maxRetries) {
          break;
        }

        // 计算延迟
        const delay = this.calculateDelay(attempt, config, error);
        await this.sleep(delay);

        // 记录重试日志
        logger.warn('Retrying operation', {
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          delay,
          error: error.message,
        });
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number, config: RetryConfig, error: any): number {
    // 优先使用服务端返回的 Retry-After
    if (config.respectRetryAfter && error.retryAfter) {
      return error.retryAfter * 1000;
    }

    switch (config.backoff) {
      case 'exponential':
        return Math.min(
          config.initialDelay * Math.pow(2, attempt),
          config.maxDelay || 30000
        );
      case 'linear':
        return config.initialDelay * (attempt + 1);
      default:
        return config.initialDelay;
    }
  }
}
```

### 3. Sandbox 故障恢复

```typescript
class SandboxRecoveryManager {
  // 健康检查
  async healthCheck(sandboxId: string): Promise<HealthStatus> {
    const sandbox = await this.getSandbox(sandboxId);

    const checks = await Promise.all([
      this.checkContainerAlive(sandbox.containerId),
      this.checkAgentResponsive(sandboxId),
      this.checkResourceUsage(sandboxId),
    ]);

    return {
      healthy: checks.every(c => c.status === 'ok'),
      checks,
    };
  }

  // 自动恢复
  async recover(sandboxId: string, reason: string): Promise<void> {
    const sandbox = await this.getSandbox(sandboxId);

    logger.info('Starting sandbox recovery', { sandboxId, reason });

    try {
      // 1. 保存当前状态
      const state = await this.saveState(sandbox);

      // 2. 停止旧容器
      await this.stopContainer(sandbox.containerId);

      // 3. 创建新容器
      const newContainer = await this.createContainer(sandbox.config);

      // 4. 恢复状态
      await this.restoreState(newContainer.id, state);

      // 5. 更新数据库
      await this.updateSandbox(sandboxId, {
        containerId: newContainer.id,
        status: 'running',
        recoveredAt: new Date(),
      });

      // 6. 通知用户
      await this.notifyUser(sandbox.userId, {
        type: 'sandbox_recovered',
        sandboxId,
        message: 'Sandbox 已自动恢复',
      });

    } catch (error) {
      logger.error('Sandbox recovery failed', { sandboxId, error });

      // 标记为失败，需要人工干预
      await this.updateSandbox(sandboxId, {
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  // 状态保存（用于恢复）
  private async saveState(sandbox: Sandbox): Promise<SandboxState> {
    return {
      workingDirectory: await this.getWorkingDirectory(sandbox),
      gitState: await this.getGitState(sandbox),
      environmentVariables: sandbox.config.env,
      runningProcesses: await this.getRunningProcesses(sandbox),
    };
  }
}
```

### 4. 断线重连机制

```typescript
// 前端 WebSocket 重连
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private messageQueue: Message[] = [];

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
      this.startHeartbeat();
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();

      // 非正常关闭，尝试重连
      if (!event.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // 错误时 WebSocket 会自动关闭，触发 onclose
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnect_failed');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    setTimeout(() => {
      this.connect(this.url);
    }, delay);
  }

  // 离线消息队列
  send(message: Message): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // 缓存消息，重连后发送
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.ws?.send(JSON.stringify(message));
    }
  }

  // 心跳机制
  private heartbeatInterval: NodeJS.Timer | null = null;

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 30000);
  }
}
```

---

## 前端 UI/UX 设计

### 1. 页面布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Logo   [Projects ▼]  [+ New Project]                    [User ▼] [Settings]│
├─────────────────────────────────────────────────────────────────────────────┤
│         │                                                                    │
│         │  ┌──────────────────────────────────────────────────────────────┐ │
│ Project │  │  Terminal Tabs                                               │ │
│  Tree   │  │  [main ●] [feature/auth] [feature/ui] [+]                   │ │
│         │  ├──────────────────────────────────────────────────────────────┤ │
│ ─────── │  │                                                              │ │
│         │  │                                                              │ │
│ branch  │  │                    Terminal Area                             │ │
│  main   │  │                   (xterm.js)                                 │ │
│  ├─feat │  │                                                              │ │
│  └─fix  │  │  $ claude "implement user login"                            │ │
│         │  │  ⏳ Thinking...                                              │ │
│ ─────── │  │  📝 Creating src/auth/login.ts                              │ │
│         │  │  ✅ Done                                                     │ │
│  Files  │  │                                                              │ │
│  src/   │  │                                                              │ │
│   └─... │  └──────────────────────────────────────────────────────────────┘ │
│         │                                                                    │
│         │  ┌──────────────────────────────────────────────────────────────┐ │
│         │  │  Task Progress                              [Create PR]      │ │
│         │  │  ████████████████████░░░░░░░░ 70%          [View Diff]       │ │
│         │  │  Current: Writing tests...                                   │ │
│         │  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. 关键页面设计

```typescript
// 页面路由结构
const routes = [
  // 公开页面
  { path: '/', component: LandingPage },
  { path: '/login', component: LoginPage },
  { path: '/oauth/callback/:provider', component: OAuthCallback },

  // 应用页面（需要认证）
  { path: '/dashboard', component: Dashboard },
  { path: '/projects', component: ProjectList },
  { path: '/projects/new', component: NewProject },
  { path: '/projects/:id', component: ProjectWorkspace },
  { path: '/projects/:id/settings', component: ProjectSettings },

  // 用户设置
  { path: '/settings', component: UserSettings },
  { path: '/settings/api-keys', component: APIKeyManagement },
  { path: '/settings/billing', component: BillingPage },
];
```

### 3. 核心组件

```typescript
// 终端组件
interface TerminalPanelProps {
  sandboxId: string;
  sessionId: string;
  readOnly?: boolean;
  onStatusChange?: (status: TerminalStatus) => void;
}

// 任务面板组件
interface TaskPanelProps {
  taskId: string;
  onComplete?: (result: TaskResult) => void;
  onCreatePR?: () => void;
}

// 文件树组件
interface FileTreeProps {
  projectId: string;
  sandboxId: string;
  onFileSelect?: (path: string) => void;
  onFileChange?: (event: FileChangeEvent) => void;
}

// 差异查看器
interface DiffViewerProps {
  sandboxId: string;
  baseBranch: string;
  compareBranch: string;
  files?: string[];  // 可选：只显示特定文件
}
```

### 4. 用户交互流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         用户工作流程                                         │
│                                                                              │
│  1. 导入项目                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   粘贴      │───>│   授权      │───>│   克隆      │───>│   就绪      │  │
│  │ GitHub URL  │    │   GitHub    │    │   项目      │    │   使用      │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
│  2. 创建任务                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  选择分支   │───>│  输入任务   │───>│  确认配置   │───>│  开始执行   │  │
│  │  或新建     │    │  描述       │    │  (可选)     │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
│  3. 监控执行                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  实时输出   │───>│  交互输入   │───>│  查看进度   │───>│  查看结果   │  │
│  │  (终端)     │    │  (如需要)   │    │  (进度条)   │    │  (差异)     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
│  4. 创建 PR                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  预览变更   │───>│  编辑描述   │───>│  选择目标   │───>│  创建 PR    │  │
│  │  (Diff)     │    │  (可选)     │    │  分支       │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5. 响应式设计

```typescript
// 断点定义
const breakpoints = {
  mobile: 0,      // 0-767px
  tablet: 768,    // 768-1023px
  desktop: 1024,  // 1024-1439px
  wide: 1440,     // 1440px+
};

// 布局适配
const layoutConfig = {
  mobile: {
    sidebarVisible: false,
    sidebarWidth: '100%',
    terminalHeight: '60vh',
    showFileTabs: false,  // 使用下拉选择
  },
  tablet: {
    sidebarVisible: true,
    sidebarWidth: '240px',
    sidebarCollapsible: true,
    terminalHeight: '50vh',
  },
  desktop: {
    sidebarVisible: true,
    sidebarWidth: '280px',
    terminalHeight: 'calc(100vh - 200px)',
  },
};
```

---

## 计费与配额系统

### 1. 计费模型

```typescript
// 订阅计划
interface SubscriptionPlan {
  id: string;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: PlanFeatures;
}

interface PlanFeatures {
  // Sandbox 限制
  maxConcurrentSandboxes: number;
  sandboxCpuLimit: number;         // CPU 核心数
  sandboxMemoryLimit: number;       // MB
  sandboxStorageLimit: number;      // GB
  sandboxTimeoutMinutes: number;    // 单次最大运行时间

  // 项目限制
  maxProjects: number;
  maxCollaborators: number;

  // API 限制
  apiRequestsPerMinute: number;

  // 存储
  storageLimit: number;             // GB

  // 功能开关
  terminalRecording: boolean;
  workflowAutomation: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
}

// 计划定义
const plans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    features: {
      maxConcurrentSandboxes: 1,
      sandboxCpuLimit: 1,
      sandboxMemoryLimit: 2048,
      sandboxStorageLimit: 5,
      sandboxTimeoutMinutes: 30,
      maxProjects: 3,
      maxCollaborators: 0,
      apiRequestsPerMinute: 10,
      storageLimit: 1,
      terminalRecording: false,
      workflowAutomation: false,
      prioritySupport: false,
      customBranding: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 20, yearly: 192 },
    features: {
      maxConcurrentSandboxes: 5,
      sandboxCpuLimit: 2,
      sandboxMemoryLimit: 4096,
      sandboxStorageLimit: 20,
      sandboxTimeoutMinutes: 120,
      maxProjects: 20,
      maxCollaborators: 5,
      apiRequestsPerMinute: 60,
      storageLimit: 10,
      terminalRecording: true,
      workflowAutomation: true,
      prioritySupport: false,
      customBranding: false,
    },
  },
  {
    id: 'team',
    name: 'Team',
    price: { monthly: 50, yearly: 480 },
    features: {
      maxConcurrentSandboxes: 20,
      sandboxCpuLimit: 4,
      sandboxMemoryLimit: 8192,
      sandboxStorageLimit: 50,
      sandboxTimeoutMinutes: 240,
      maxProjects: -1,  // 无限制
      maxCollaborators: -1,
      apiRequestsPerMinute: 200,
      storageLimit: 100,
      terminalRecording: true,
      workflowAutomation: true,
      prioritySupport: true,
      customBranding: true,
    },
  },
];
```

### 2. 配额检查

```typescript
class QuotaManager {
  async checkQuota(userId: string, resource: ResourceType): Promise<QuotaResult> {
    const user = await this.getUser(userId);
    const plan = this.getPlan(user.planId);
    const usage = await this.getCurrentUsage(userId, resource);

    const limit = this.getLimit(plan, resource);

    return {
      allowed: usage < limit,
      current: usage,
      limit,
      remaining: Math.max(0, limit - usage),
      resetAt: this.getResetTime(resource),
    };
  }

  async enforceQuota(userId: string, resource: ResourceType): Promise<void> {
    const quota = await this.checkQuota(userId, resource);

    if (!quota.allowed) {
      throw new QuotaExceededError({
        resource,
        current: quota.current,
        limit: quota.limit,
        resetAt: quota.resetAt,
        upgradeUrl: '/settings/billing',
      });
    }
  }

  // 装饰器方式使用
  @CheckQuota('sandbox')
  async createSandbox(userId: string, config: SandboxConfig): Promise<Sandbox> {
    // 创建逻辑
  }
}

// 配额检查中间件
function quotaMiddleware(resource: ResourceType) {
  return async (ctx: Context, next: Next) => {
    await quotaManager.enforceQuota(ctx.userId, resource);
    await next();
  };
}
```

### 3. 使用量追踪

```typescript
class UsageTracker {
  // 记录使用量
  async record(event: UsageEvent): Promise<void> {
    await this.db.insert(usageRecords).values({
      userId: event.userId,
      type: event.type,
      amount: event.amount,
      unit: event.unit,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      recordedAt: new Date(),
    });

    // 更新实时计数器（用于限流）
    await this.redis.hincrby(
      `usage:${event.userId}:${event.type}`,
      this.getCurrentPeriod(),
      event.amount
    );
  }

  // 获取使用量统计
  async getUsageSummary(userId: string, period: Period): Promise<UsageSummary> {
    const [startDate, endDate] = this.getPeriodRange(period);

    const records = await this.db.query.usageRecords.findMany({
      where: and(
        eq(usageRecords.userId, userId),
        gte(usageRecords.recordedAt, startDate),
        lt(usageRecords.recordedAt, endDate)
      ),
    });

    return {
      period,
      sandboxMinutes: this.sumByType(records, 'sandbox_time'),
      apiCalls: this.sumByType(records, 'api_call'),
      storageBytes: this.sumByType(records, 'storage'),
      claudeTokens: {
        input: this.sumByType(records, 'claude_input_tokens'),
        output: this.sumByType(records, 'claude_output_tokens'),
      },
    };
  }
}
```

### 4. 数据库 Schema 补充

```sql
-- 订阅表
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'cancelled', 'expired'

    -- 支付信息
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),

    -- 周期
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,

    -- 取消信息
    cancel_at TIMESTAMP,
    cancelled_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 计费事件表（用于对账）
CREATE TABLE billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    type VARCHAR(50) NOT NULL,  -- 'subscription_created', 'payment_succeeded', 'payment_failed'
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Stripe 事件信息
    stripe_event_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX idx_billing_events_stripe_event_id ON billing_events(stripe_event_id);
```

---

## 测试策略

### 1. 测试金字塔

```
                    ┌───────────┐
                    │   E2E     │  10%
                    │  Tests    │
                ┌───┴───────────┴───┐
                │   Integration     │  20%
                │      Tests        │
            ┌───┴───────────────────┴───┐
            │        Unit Tests         │  70%
            └───────────────────────────┘
```

### 2. 测试分类

```typescript
// 单元测试示例
describe('QuotaManager', () => {
  describe('checkQuota', () => {
    it('should return allowed=true when under limit', async () => {
      const manager = new QuotaManager(mockDb, mockRedis);
      const result = await manager.checkQuota('user-1', 'sandbox');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should return allowed=false when at limit', async () => {
      mockDb.setUsage('user-1', 'sandbox', 5);  // 达到免费计划限制

      const result = await manager.checkQuota('user-1', 'sandbox');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});

// 集成测试示例
describe('Sandbox Creation Flow', () => {
  it('should create sandbox and establish terminal connection', async () => {
    // 创建 sandbox
    const sandbox = await request(app)
      .post('/api/sandboxes')
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId: 'test-project' })
      .expect(201);

    // 等待 sandbox 就绪
    await waitFor(() =>
      request(app)
        .get(`/api/sandboxes/${sandbox.body.id}`)
        .expect(200)
        .then(r => r.body.status === 'ready')
    );

    // 建立 WebSocket 连接
    const ws = new WebSocket(
      `ws://localhost:3000/ws/terminals/${sandbox.body.id}`
    );

    await waitForOpen(ws);

    // 发送命令
    ws.send(JSON.stringify({ type: 'input', payload: { data: 'ls\n' } }));

    // 验证输出
    const output = await waitForMessage(ws, 'output');
    expect(output.payload.data).toContain('workspace');
  });
});

// E2E 测试示例 (Playwright)
test('complete workflow: import project and run claude task', async ({ page }) => {
  // 登录
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.click('button[type=submit]');

  // 导入项目
  await page.goto('/projects/new');
  await page.fill('[name=repository]', 'https://github.com/test/repo');
  await page.click('button:has-text("Import")');

  // 等待导入完成
  await expect(page.locator('.project-ready')).toBeVisible({ timeout: 60000 });

  // 在终端中运行 Claude 任务
  await page.click('.terminal-input');
  await page.keyboard.type('claude "add a hello world function"');
  await page.keyboard.press('Enter');

  // 等待任务完成
  await expect(page.locator('.task-complete')).toBeVisible({ timeout: 120000 });

  // 验证文件被创建
  await expect(page.locator('.file-tree')).toContainText('hello.ts');
});
```

### 3. 测试覆盖率目标

| 模块 | 目标覆盖率 |
|------|-----------|
| Core Services | 80% |
| API Routes | 75% |
| WebSocket Handlers | 70% |
| UI Components | 60% |
| E2E Critical Paths | 100% |

---

## 安全设计

### 1. 认证安全
- JWT token 使用 RS256 签名
- Access token 有效期 15 分钟
- Refresh token 有效期 7 天，支持轮换
- 敏感操作需要二次验证

### 2. Sandbox 隔离
- 每个 Sandbox 运行在独立的 Docker 容器中
- 网络隔离：Sandbox 之间不能直接通信
- 资源限制：CPU、内存、磁盘 I/O 限制
- Seccomp 策略限制系统调用
- 只读挂载系统目录

### 3. 密钥管理
- OAuth token 使用 AES-256-GCM 加密存储
- 使用 HashiCorp Vault 或 AWS KMS 管理加密密钥
- API 密钥只存储 hash，不可逆

### 4. 网络安全
- 全站 HTTPS
- CORS 白名单
- Rate limiting
- DDoS 防护

---

## API 版本管理

### 1. 版本策略

```typescript
// URL 路径版本控制
// /api/v1/projects
// /api/v2/projects

// 版本路由配置
const apiVersions = {
  v1: {
    deprecated: false,
    sunsetDate: null,
    routes: v1Routes,
  },
  v2: {
    deprecated: false,
    sunsetDate: null,
    routes: v2Routes,
  },
};

// 版本中间件
function versionMiddleware(version: string) {
  return (ctx: Context, next: Next) => {
    const config = apiVersions[version];

    if (config.deprecated) {
      ctx.set('Deprecation', 'true');
      ctx.set('Sunset', config.sunsetDate);
      ctx.set('Link', `</api/v${latestVersion}>; rel="successor-version"`);
    }

    ctx.apiVersion = version;
    return next();
  };
}
```

### 2. 变更策略

| 变更类型 | 处理方式 |
|----------|----------|
| 新增字段 | 向后兼容，无需新版本 |
| 可选字段变必填 | 需要新版本 |
| 移除字段 | 先标记废弃，下个主版本移除 |
| 修改字段类型 | 需要新版本 |
| 新增端点 | 向后兼容，无需新版本 |
| 移除端点 | 先标记废弃，下个主版本移除 |

---

## 部署架构

### 单机部署（开发/小型）

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/anycode
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=anycode
      - POSTGRES_PASSWORD=password

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 生产部署（Kubernetes）

```yaml
# 简化的 K8s 部署示意
apiVersion: apps/v1
kind: Deployment
metadata:
  name: anycode-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: anycode/api:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: anycode-api
spec:
  type: ClusterIP
  ports:
  - port: 3000
```

---

## 项目结构

```
anycode/
├── apps/
│   ├── desktop/                    # Tauri Desktop App (壳)
│   │   ├── src/                    # 前端代码 (React)
│   │   │   ├── components/
│   │   │   │   ├── terminal/       # 终端组件 (xterm.js)
│   │   │   │   ├── project/        # 项目管理组件
│   │   │   │   ├── sandbox/        # Sandbox 控制组件
│   │   │   │   └── ui/             # shadcn/ui 组件
│   │   │   ├── hooks/              # React hooks
│   │   │   ├── stores/             # Zustand stores
│   │   │   ├── pages/              # 页面组件
│   │   │   ├── lib/
│   │   │   │   ├── api.ts          # Sidecar API 客户端
│   │   │   │   └── utils.ts
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   │
│   │   ├── src-tauri/              # Tauri Rust 壳 (最小化)
│   │   │   ├── src/
│   │   │   │   └── main.rs         # 仅启动 sidecar + 窗口管理
│   │   │   ├── Cargo.toml
│   │   │   ├── tauri.conf.json
│   │   │   └── icons/
│   │   │
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── sidecar/                    # Node.js Sidecar (核心服务)
│       ├── src/
│       │   ├── index.ts            # 入口
│       │   ├── server.ts           # Fastify HTTP 服务
│       │   ├── services/
│       │   │   ├── credentials.ts  # Keychain 凭证管理
│       │   │   ├── docker.ts       # Docker 容器管理
│       │   │   ├── terminal.ts     # PTY 终端管理
│       │   │   ├── git.ts          # Git 操作
│       │   │   └── project.ts      # 项目管理
│       │   ├── routes/
│       │   │   ├── credentials.ts  # /api/credentials
│       │   │   ├── sandboxes.ts    # /api/sandboxes
│       │   │   ├── terminals.ts    # /api/terminals
│       │   │   ├── projects.ts     # /api/projects
│       │   │   └── github.ts       # /api/github
│       │   ├── websocket/
│       │   │   └── terminal.ts     # 终端 WebSocket 处理
│       │   ├── database/
│       │   │   ├── index.ts        # SQLite 初始化
│       │   │   └── schema.ts       # 数据库 Schema
│       │   └── utils/
│       │       ├── logger.ts
│       │       └── errors.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared/                     # 共享类型和工具
│   │   ├── src/
│   │   │   ├── types/              # API 类型定义
│   │   │   │   ├── credentials.ts
│   │   │   │   ├── sandbox.ts
│   │   │   │   ├── terminal.ts
│   │   │   │   ├── project.ts
│   │   │   │   └── api.ts
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── sandbox-image/              # Sandbox Docker 镜像
│       ├── Dockerfile
│       └── scripts/
│
├── docker/
│   └── docker-compose.yml
│
├── docs/
│   ├── DESIGN.md
│   ├── DEVELOPMENT.md
│   └── ROADMAP.md
│
├── scripts/
│   ├── setup.sh
│   ├── build.sh
│   └── dev.sh                      # 同时启动 Tauri + Sidecar
│
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### Sidecar 详细结构

```
apps/sidecar/
├── src/
│   ├── index.ts                    # 入口，启动服务
│   │
│   ├── server.ts                   # Fastify 服务配置
│   │   └── 监听 localhost:19876
│   │
│   ├── services/
│   │   ├── credentials.ts          # 凭证管理
│   │   │   ├── readCredentials()   # 从 Keychain 读取
│   │   │   ├── checkLogin()        # 检查登录状态
│   │   │   └── getStatus()         # 获取状态信息
│   │   │
│   │   ├── docker.ts               # Docker 管理
│   │   │   ├── createSandbox()     # 创建容器
│   │   │   ├── destroySandbox()    # 销毁容器
│   │   │   ├── listSandboxes()     # 列出容器
│   │   │   └── execInSandbox()     # 执行命令
│   │   │
│   │   ├── terminal.ts             # 终端管理
│   │   │   ├── createTerminal()    # 创建 PTY
│   │   │   ├── writeTerminal()     # 写入输入
│   │   │   ├── resizeTerminal()    # 调整大小
│   │   │   └── closeTerminal()     # 关闭终端
│   │   │
│   │   ├── git.ts                  # Git 操作
│   │   │   ├── cloneRepo()         # 克隆仓库
│   │   │   ├── listBranches()      # 列出分支
│   │   │   ├── checkout()          # 切换分支
│   │   │   └── getDiff()           # 获取差异
│   │   │
│   │   └── project.ts              # 项目管理
│   │       ├── createProject()     # 创建项目
│   │       ├── listProjects()      # 列出项目
│   │       └── deleteProject()     # 删除项目
│   │
│   ├── routes/                     # API 路由
│   │   ├── credentials.ts          # GET/POST /api/credentials
│   │   ├── sandboxes.ts            # CRUD /api/sandboxes
│   │   ├── terminals.ts            # CRUD /api/terminals
│   │   ├── projects.ts             # CRUD /api/projects
│   │   └── github.ts               # GitHub 相关
│   │
│   ├── websocket/
│   │   └── terminal.ts             # WebSocket 终端通信
│   │       └── ws://localhost:19876/ws/terminals/:id
│   │
│   └── database/
│       ├── index.ts                # better-sqlite3 初始化
│       └── schema.ts               # 表结构
│
├── package.json
│   └── dependencies:
│       ├── fastify
│       ├── @fastify/websocket
│       ├── keytar
│       ├── dockerode
│       ├── node-pty
│       ├── simple-git
│       └── better-sqlite3
│
└── tsconfig.json
```

### API 端点设计

```yaml
# Sidecar HTTP API (localhost:19876)

# 凭证
GET  /api/credentials/status     # 获取登录状态
GET  /api/credentials            # 读取凭证（内部用）

# Sandbox
GET    /api/sandboxes            # 列出所有 sandbox
POST   /api/sandboxes            # 创建 sandbox
GET    /api/sandboxes/:id        # 获取 sandbox 详情
DELETE /api/sandboxes/:id        # 删除 sandbox
POST   /api/sandboxes/:id/exec   # 在 sandbox 中执行命令

# 终端
GET    /api/terminals            # 列出所有终端
POST   /api/terminals            # 创建终端
DELETE /api/terminals/:id        # 关闭终端
POST   /api/terminals/:id/resize # 调整大小

# 项目
GET    /api/projects             # 列出项目
POST   /api/projects             # 创建/导入项目
GET    /api/projects/:id         # 获取项目详情
DELETE /api/projects/:id         # 删除项目
POST   /api/projects/:id/clone   # 克隆到 sandbox

# Git
GET    /api/projects/:id/branches     # 列出分支
POST   /api/projects/:id/branches     # 创建分支
GET    /api/projects/:id/diff         # 获取差异
POST   /api/projects/:id/commit       # 提交
POST   /api/projects/:id/push         # 推送

# GitHub
POST   /api/github/import        # 导入 GitHub 项目
POST   /api/github/pr            # 创建 PR

# WebSocket
WS     /ws/terminals/:id         # 终端实时通信
```

---

## 开发里程碑

### Phase 1: 核心基础 (MVP)
- [ ] Tauri + Node.js Sidecar 项目脚手架搭建
- [ ] Node.js 凭证管理模块（keytar 读取 Keychain）
- [ ] Docker 容器管理（dockerode）
- [ ] 单个终端 + 单个 Sandbox
- [ ] 基础 Claude Code 集成
- [ ] GitHub 项目克隆

### Phase 2: 完整终端体验
- [ ] xterm.js 终端组件
- [ ] PTY 实时通信（WebSocket）
- [ ] 多终端标签页支持
- [ ] 终端会话持久化

### Phase 3: 项目管理
- [ ] 项目列表和管理
- [ ] Git 分支操作
- [ ] 文件树浏览
- [ ] 代码差异查看
- [ ] PR 创建（GitHub API）

### Phase 4: 多 Sandbox 并行
- [ ] 多 Sandbox 并行运行
- [ ] 任务编排和调度
- [ ] 资源监控和限制
- [ ] Sandbox 状态同步

### Phase 5: 高级功能
- [ ] 工作流编排器
- [ ] 终端录制与回放
- [ ] 云端同步（可选）
- [ ] 自动更新机制

### Phase 6: 发布与分发
- [ ] macOS 签名和公证
- [ ] Windows 签名
- [ ] Linux 打包（AppImage/deb）
- [ ] 自动更新服务器

---

## 附录

### A. 环境变量

```bash
# 应用配置
NODE_ENV=production
PORT=3000
API_URL=https://api.anycode.jacky.cn

# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/anycode

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# GitHub OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_CALLBACK_URL=https://anycode.jacky.cn/auth/github/callback

# Anthropic OAuth (假设有此功能)
ANTHROPIC_CLIENT_ID=xxx
ANTHROPIC_CLIENT_SECRET=xxx
ANTHROPIC_CALLBACK_URL=https://anycode.jacky.cn/auth/anthropic/callback

# Docker
DOCKER_HOST=unix:///var/run/docker.sock
SANDBOX_IMAGE=anycode/sandbox:latest
SANDBOX_NETWORK=sandbox-network
```

### B. 常见问题

**Q: 如何处理 Claude API 的 rate limiting?**
A: 使用 Token Bucket 算法，每个用户独立的令牌桶，支持突发请求但限制平均速率。

**Q: Sandbox 资源如何自动回收?**
A: 实现 TTL 机制，空闲超过 30 分钟自动暂停，24 小时无活动自动销毁。

**Q: 如何保证 WebSocket 连接的可靠性?**
A: 实现心跳机制、自动重连、消息确认和离线消息缓存。

**Q: 如何在没有 Anthropic OAuth 的情况下支持用户自带订阅?**
A: 主要支持两种方式：
1. 用户直接提供 Anthropic API Key（推荐）
2. 未来 Anthropic 开放 OAuth 后无缝切换

**Q: 如何处理用户的 API Key 安全性?**
A:
1. 使用 AES-256-GCM 加密存储
2. 内存中解密，用后立即清除
3. 只在创建时显示完整 key，之后只显示前缀
4. 支持 key 轮换和撤销

**Q: 多个 Sandbox 如何共享代码仓库?**
A:
1. 每个 Sandbox 独立克隆仓库
2. 使用 Git worktree 优化存储（可选）
3. 共享的 Git LFS 缓存

**Q: 如何处理 Claude Code 的长时间运行任务?**
A:
1. 设置任务超时时间（可配置）
2. 定期检查点保存
3. 支持任务暂停和恢复
4. 异常中断后自动恢复

---

### C. 性能基准

| 操作 | 目标延迟 | 备注 |
|------|----------|------|
| API 响应 (P95) | < 200ms | 不含 Claude API 调用 |
| Sandbox 创建 | < 10s | 冷启动 |
| Sandbox 创建 | < 3s | 热启动（有缓存镜像） |
| WebSocket 建立 | < 500ms | |
| 终端首次输出 | < 1s | 从输入到看到响应 |
| GitHub 项目克隆 | < 30s | 中等大小仓库 |

---

### D. 安全检查清单

- [ ] OAuth Token 加密存储
- [ ] API Key 只存储 hash
- [ ] SQL 注入防护（参数化查询）
- [ ] XSS 防护（内容转义）
- [ ] CSRF 防护（Token 验证）
- [ ] Rate Limiting 已启用
- [ ] Sandbox 网络隔离验证
- [ ] 敏感日志脱敏
- [ ] HTTPS 强制启用
- [ ] 安全响应头配置
- [ ] 依赖漏洞扫描
- [ ] 容器镜像漏洞扫描

---

### E. 运维手册

#### 常用运维命令

```bash
# 查看所有运行中的 Sandbox
docker ps --filter "label=app=anycode-sandbox"

# 强制清理僵尸 Sandbox
./scripts/cleanup-zombies.sh

# 查看系统资源使用
docker stats --filter "label=app=anycode-sandbox"

# 数据库迁移
pnpm db:migrate

# 备份数据库
pg_dump anycode > backup_$(date +%Y%m%d).sql

# 查看实时日志
docker logs -f anycode-api

# 重启服务（零停机）
docker service update --image anycode/api:latest anycode-api
```

#### 故障排查流程

```
1. 检查服务状态
   └── docker ps / kubectl get pods

2. 查看错误日志
   └── 检查 Grafana/Loki 告警
   └── docker logs anycode-api

3. 检查依赖服务
   └── PostgreSQL 连接
   └── Redis 连接
   └── Docker daemon

4. 检查资源使用
   └── CPU/内存使用率
   └── 磁盘空间
   └── 网络连接数

5. 回滚（如需要）
   └── docker service rollback anycode-api
```

---

### F. 第三方服务集成

| 服务 | 用途 | 是否必须 |
|------|------|----------|
| Anthropic API | Claude Code 核心 | 是 |
| GitHub API | 仓库管理、PR 创建 | 是 |
| PostgreSQL | 主数据库 | 是 |
| Redis | 缓存、队列 | 是 |
| Stripe | 支付处理 | 否（仅付费功能） |
| SendGrid/Resend | 邮件发送 | 否 |
| Sentry | 错误追踪 | 否（推荐） |
| Grafana Cloud | 监控 | 否（推荐） |

---

*文档版本: 1.1*
*最后更新: 2026-01-28*
*变更记录:*
- *v1.1: 补充 Claude Code 集成设计、监控可观测性、错误处理、前端设计、计费系统、测试策略*
- *v1.0: 初始版本*
