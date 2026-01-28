# AnyCode 测试计划

## 目录

1. [测试策略概述](#测试策略概述)
2. [测试金字塔](#测试金字塔)
3. [测试环境配置](#测试环境配置)
4. [Phase 1: 核心基础测试](#phase-1-核心基础测试)
5. [Phase 2: 终端体验测试](#phase-2-终端体验测试)
6. [Phase 3: 项目管理测试](#phase-3-项目管理测试)
7. [Phase 4: 多 Sandbox 测试](#phase-4-多-sandbox-测试)
8. [Phase 5: 高级功能测试](#phase-5-高级功能测试)
9. [Phase 6: 发布测试](#phase-6-发布测试)
10. [持续集成测试](#持续集成测试)
11. [测试覆盖率要求](#测试覆盖率要求)

---

## 测试策略概述

### TDD 开发流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Test-Driven Development Cycle                         │
│                                                                              │
│     ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐         │
│     │  RED    │ ──── │  GREEN  │ ──── │REFACTOR │ ──── │  REPEAT │         │
│     │         │      │         │      │         │      │         │         │
│     │ 编写失败 │      │ 编写最小 │      │ 重构代码 │      │ 下一个   │         │
│     │ 的测试   │      │ 实现代码 │      │ 保持绿色 │      │ 功能     │         │
│     └─────────┘      └─────────┘      └─────────┘      └─────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 测试原则

1. **先写测试，后写代码** - 每个功能开发前必须先编写测试
2. **测试即文档** - 测试用例应清晰描述功能行为
3. **快速反馈** - 单元测试应在毫秒级完成
4. **隔离测试** - 每个测试独立运行，不依赖外部状态
5. **可重复性** - 测试结果应该是确定性的

---

## 测试金字塔

```
                        ┌───────────┐
                        │   E2E     │  5%   - Playwright
                        │   Tests   │        - 关键用户流程
                       ─┴───────────┴─
                      ┌───────────────┐
                      │  Integration  │ 20%  - Supertest + Testcontainers
                      │    Tests      │       - API 集成测试
                     ─┴───────────────┴─
                    ┌───────────────────┐
                    │    Component      │ 25%  - React Testing Library
                    │      Tests        │       - UI 组件测试
                   ─┴───────────────────┴─
                  ┌───────────────────────┐
                  │       Unit Tests      │ 50%  - Vitest
                  │                       │       - 业务逻辑测试
                 ─┴───────────────────────┴─
```

### 各层级职责

| 层级 | 框架 | 职责 | 执行时机 |
|------|------|------|----------|
| Unit | Vitest | 单个函数/类的逻辑 | 每次保存 |
| Component | React Testing Library | UI 组件渲染和交互 | 每次提交 |
| Integration | Supertest + Testcontainers | API 和服务集成 | 每次 PR |
| E2E | Playwright | 完整用户流程 | 每次合并到 main |

---

## 测试环境配置

### 目录结构

```
anycode/
├── apps/desktop/
│   ├── src/
│   │   └── __tests__/           # 前端单元测试
│   ├── e2e/                     # E2E 测试
│   │   ├── fixtures/
│   │   └── specs/
│   └── vitest.config.ts
├── apps/desktop/sidecar/
│   ├── src/
│   │   ├── services/
│   │   │   └── __tests__/       # 服务单元测试
│   │   └── routes/
│   │       └── __tests__/       # 路由集成测试
│   ├── test/
│   │   ├── fixtures/            # 测试数据
│   │   ├── mocks/               # Mock 对象
│   │   └── integration/         # 集成测试
│   └── vitest.config.ts
└── packages/
    └── shared/
        └── src/
            └── __tests__/       # 共享库测试
```

### 依赖安装

```bash
# Sidecar 测试依赖
cd apps/desktop/sidecar
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui
pnpm add -D testcontainers                    # Docker 集成测试
pnpm add -D supertest @types/supertest        # HTTP 测试

# Frontend 测试依赖
cd apps/desktop
pnpm add -D vitest @vitest/coverage-v8
pnpm add -D @testing-library/react @testing-library/jest-dom
pnpm add -D @testing-library/user-event
pnpm add -D jsdom
pnpm add -D msw                               # API Mock

# E2E 测试依赖
pnpm add -D @playwright/test
```

### Vitest 配置 (Sidecar)

```typescript
// apps/desktop/sidecar/vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['test/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/types/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    setupFiles: ['./test/setup.ts'],
  },
});
```

### Vitest 配置 (Frontend)

```typescript
// apps/desktop/vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/main.tsx',
        '**/*.d.ts',
      ],
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 75,
        lines: 75,
      },
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

### 测试启动脚本

```json
// apps/desktop/sidecar/package.json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:integration": "vitest run --config vitest.integration.config.ts"
  }
}

// apps/desktop/package.json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Phase 1: 核心基础测试

### 1.1 凭证服务测试 (CredentialService)

**测试文件**: `sidecar/src/services/__tests__/credentials.test.ts`

```typescript
// sidecar/src/services/__tests__/credentials.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CredentialService } from '../credentials';

// Mock keytar
vi.mock('keytar', () => ({
  default: {
    getPassword: vi.fn(),
    setPassword: vi.fn(),
    deletePassword: vi.fn(),
  },
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

describe('CredentialService', () => {
  let service: CredentialService;

  beforeEach(() => {
    service = new CredentialService();
    vi.clearAllMocks();
  });

  describe('readCredentials', () => {
    it('should return null when no credentials exist', async () => {
      // Arrange
      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(null);

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await service.readCredentials();

      // Assert
      expect(result).toBeNull();
    });

    it('should read credentials from Keychain when available', async () => {
      // Arrange
      const mockCredentials = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
        expires: Math.floor(Date.now() / 1000) + 3600,
      };

      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(
        JSON.stringify(mockCredentials)
      );

      // Act
      const result = await service.readCredentials();

      // Assert
      expect(result).toEqual(mockCredentials);
      expect(keytar.default.getPassword).toHaveBeenCalledWith(
        'Claude Code-credentials',
        'default'
      );
    });

    it('should fall back to file when Keychain fails', async () => {
      // Arrange
      const mockCredentials = {
        accessToken: 'file-access-token',
        refreshToken: 'file-refresh-token',
      };

      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(null);

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockCredentials));

      // Act
      const result = await service.readCredentials();

      // Assert
      expect(result).toEqual({
        access: 'file-access-token',
        refresh: 'file-refresh-token',
        expires: undefined,
      });
    });

    it('should use cache within TTL', async () => {
      // Arrange
      const mockCredentials = {
        access: 'cached-token',
        expires: Math.floor(Date.now() / 1000) + 3600,
      };

      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(
        JSON.stringify(mockCredentials)
      );

      // Act - first call
      await service.readCredentials();
      // Act - second call within TTL
      await service.readCredentials();

      // Assert - keytar should only be called once
      expect(keytar.default.getPassword).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      // Arrange
      const mockCredentials = {
        access: 'test-token',
        expires: Math.floor(Date.now() / 1000) + 3600,
      };

      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(
        JSON.stringify(mockCredentials)
      );

      // Act - first call
      await service.readCredentials();

      // Fast forward time past TTL
      vi.useFakeTimers();
      vi.advanceTimersByTime(61 * 1000);

      // Act - second call after TTL
      await service.readCredentials();
      vi.useRealTimers();

      // Assert - keytar should be called twice
      expect(keytar.default.getPassword).toHaveBeenCalledTimes(2);
    });
  });

  describe('isExpired', () => {
    it('should return false when no expiry is set', () => {
      // Arrange
      const creds = { access: 'token' };

      // Act & Assert
      expect(service.isExpired(creds)).toBe(false);
    });

    it('should return false when token is not expired', () => {
      // Arrange
      const creds = {
        access: 'token',
        expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      // Act & Assert
      expect(service.isExpired(creds)).toBe(false);
    });

    it('should return true when token is expired', () => {
      // Arrange
      const creds = {
        access: 'token',
        expires: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
      };

      // Act & Assert
      expect(service.isExpired(creds)).toBe(true);
    });

    it('should return true when token expires within buffer time (5 min)', () => {
      // Arrange
      const creds = {
        access: 'token',
        expires: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
      };

      // Act & Assert
      expect(service.isExpired(creds)).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear the credential cache', async () => {
      // Arrange
      const mockCredentials = { access: 'test-token' };
      const keytar = await import('keytar');
      vi.mocked(keytar.default.getPassword).mockResolvedValue(
        JSON.stringify(mockCredentials)
      );

      await service.readCredentials();

      // Act
      service.clearCache();
      await service.readCredentials();

      // Assert - keytar should be called twice (cache was cleared)
      expect(keytar.default.getPassword).toHaveBeenCalledTimes(2);
    });
  });
});
```

### 1.2 Docker 服务测试 (DockerService)

**测试文件**: `sidecar/src/services/__tests__/docker.test.ts`

```typescript
// sidecar/src/services/__tests__/docker.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DockerService, SandboxConfig } from '../docker';
import { CredentialService } from '../credentials';

// Mock dockerode
vi.mock('dockerode', () => {
  const mockContainer = {
    id: 'mock-container-id',
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  return {
    default: vi.fn().mockImplementation(() => ({
      createContainer: vi.fn().mockResolvedValue(mockContainer),
      getContainer: vi.fn().mockReturnValue(mockContainer),
      listContainers: vi.fn().mockResolvedValue([]),
      ping: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
}));

describe('DockerService', () => {
  let dockerService: DockerService;
  let mockCredentialService: CredentialService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCredentialService = {
      readCredentials: vi.fn().mockResolvedValue({
        access: 'test-access-token',
      }),
      isExpired: vi.fn().mockReturnValue(false),
      clearCache: vi.fn(),
    } as unknown as CredentialService;

    dockerService = new DockerService(mockCredentialService);
  });

  describe('createSandbox', () => {
    it('should create a sandbox container with correct configuration', async () => {
      // Arrange
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
        branch: 'feature-branch',
      };

      // Act
      const result = await dockerService.createSandbox(config);

      // Assert
      expect(result).toEqual({
        id: 'test-uuid-1234',
        containerId: 'mock-container-id',
        status: 'running',
        projectId: 'proj-123',
      });
    });

    it('should throw error when no credentials available', async () => {
      // Arrange
      mockCredentialService.readCredentials = vi.fn().mockResolvedValue(null);
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
      };

      // Act & Assert
      await expect(dockerService.createSandbox(config)).rejects.toThrow(
        'No credentials found'
      );
    });

    it('should inject credentials as environment variables', async () => {
      // Arrange
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
      };

      // Act
      await dockerService.createSandbox(config);

      // Assert
      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: expect.arrayContaining([
            'ANTHROPIC_API_KEY=test-access-token',
            'SANDBOX_ID=test-uuid-1234',
            'PROJECT_ID=proj-123',
          ]),
        })
      );
    });

    it('should set resource limits on container', async () => {
      // Arrange
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();
      const config: SandboxConfig = {
        projectId: 'proj-123',
        projectPath: '/path/to/project',
      };

      // Act
      await dockerService.createSandbox(config);

      // Assert
      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          HostConfig: expect.objectContaining({
            Memory: 4 * 1024 * 1024 * 1024, // 4GB
            NanoCpus: 2_000_000_000,         // 2 CPU
          }),
        })
      );
    });
  });

  describe('destroySandbox', () => {
    it('should stop and remove the container', async () => {
      // Arrange
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();
      const mockContainer = mockDocker.getContainer('test-id');

      // Act
      await dockerService.destroySandbox('test-id');

      // Assert
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    it('should handle already stopped container gracefully', async () => {
      // Arrange
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();
      const mockContainer = mockDocker.getContainer('test-id');
      mockContainer.stop = vi.fn().mockRejectedValue(new Error('already stopped'));

      // Act & Assert - should not throw
      await expect(dockerService.destroySandbox('test-id')).resolves.not.toThrow();
      expect(mockContainer.remove).toHaveBeenCalled();
    });
  });

  describe('listSandboxes', () => {
    it('should return list of sandbox containers', async () => {
      // Arrange
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();
      mockDocker.listContainers = vi.fn().mockResolvedValue([
        {
          Id: 'container-1',
          State: 'running',
          Labels: {
            app: 'anycode-sandbox',
            sandbox_id: 'sandbox-1',
            project_id: 'proj-1',
          },
        },
        {
          Id: 'container-2',
          State: 'exited',
          Labels: {
            app: 'anycode-sandbox',
            sandbox_id: 'sandbox-2',
            project_id: 'proj-2',
          },
        },
      ]);

      // Act
      const result = await dockerService.listSandboxes();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'sandbox-1',
        containerId: 'container-1',
        status: 'running',
        projectId: 'proj-1',
      });
    });

    it('should filter by anycode-sandbox label', async () => {
      // Arrange
      const Docker = (await import('dockerode')).default;
      const mockDocker = new Docker();

      // Act
      await dockerService.listSandboxes();

      // Assert
      expect(mockDocker.listContainers).toHaveBeenCalledWith({
        filters: { label: ['app=anycode-sandbox'] },
      });
    });
  });
});
```

### 1.3 Docker 服务集成测试

**测试文件**: `sidecar/test/integration/docker.integration.test.ts`

```typescript
// sidecar/test/integration/docker.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import Docker from 'dockerode';
import { DockerService } from '../../src/services/docker';
import { CredentialService } from '../../src/services/credentials';

describe('DockerService Integration', () => {
  let docker: Docker;
  let dockerService: DockerService;
  let mockCredentialService: CredentialService;
  let createdContainers: string[] = [];

  beforeAll(async () => {
    docker = new Docker();

    // Verify Docker is available
    try {
      await docker.ping();
    } catch (error) {
      throw new Error('Docker is not available. Please start Docker Desktop.');
    }
  });

  beforeEach(() => {
    mockCredentialService = {
      readCredentials: async () => ({
        access: 'test-integration-token',
      }),
      isExpired: () => false,
      clearCache: () => {},
    } as unknown as CredentialService;

    dockerService = new DockerService(mockCredentialService);
  });

  afterAll(async () => {
    // Cleanup all created containers
    for (const containerId of createdContainers) {
      try {
        const container = docker.getContainer(containerId);
        await container.stop().catch(() => {});
        await container.remove({ force: true }).catch(() => {});
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should create and destroy a real sandbox container', async () => {
    // Skip if no Docker
    if (!docker) return;

    // Arrange
    const config = {
      projectId: 'integration-test-project',
      projectPath: '/tmp',
    };

    // Act - Create
    const sandbox = await dockerService.createSandbox(config);
    createdContainers.push(sandbox.containerId);

    // Assert - Container exists
    const container = docker.getContainer(sandbox.containerId);
    const info = await container.inspect();
    expect(info.State.Running).toBe(true);

    // Act - Destroy
    await dockerService.destroySandbox(sandbox.containerId);

    // Assert - Container is gone
    await expect(container.inspect()).rejects.toThrow();
  }, 60000); // 60s timeout for container operations

  it('should list only anycode sandbox containers', async () => {
    // Skip if no Docker
    if (!docker) return;

    // Arrange - Create a sandbox
    const config = {
      projectId: 'list-test-project',
      projectPath: '/tmp',
    };
    const sandbox = await dockerService.createSandbox(config);
    createdContainers.push(sandbox.containerId);

    // Act
    const sandboxes = await dockerService.listSandboxes();

    // Assert
    expect(sandboxes.some((s) => s.id === sandbox.id)).toBe(true);

    // Cleanup
    await dockerService.destroySandbox(sandbox.containerId);
  }, 60000);
});
```

### 1.4 凭证 API 路由测试

**测试文件**: `sidecar/src/routes/__tests__/credentials.test.ts`

```typescript
// sidecar/src/routes/__tests__/credentials.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { credentialRoutes } from '../credentials';
import { CredentialService } from '../../services/credentials';

describe('Credential Routes', () => {
  let app: FastifyInstance;
  let mockCredentialService: CredentialService;

  beforeEach(async () => {
    mockCredentialService = {
      readCredentials: vi.fn(),
      isExpired: vi.fn(),
      clearCache: vi.fn(),
    } as unknown as CredentialService;

    app = Fastify();
    app.decorate('credentialService', mockCredentialService);
    await app.register(credentialRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/credentials', () => {
    it('should return logged in status when credentials exist', async () => {
      // Arrange
      mockCredentialService.readCredentials = vi.fn().mockResolvedValue({
        access: 'test-token',
        expires: Math.floor(Date.now() / 1000) + 3600,
      });
      mockCredentialService.isExpired = vi.fn().mockReturnValue(false);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/credentials',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        loggedIn: true,
        expired: false,
        expiresAt: expect.any(Number),
      });
    });

    it('should return not logged in when no credentials', async () => {
      // Arrange
      mockCredentialService.readCredentials = vi.fn().mockResolvedValue(null);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/credentials',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        loggedIn: false,
        expired: false,
        expiresAt: null,
      });
    });

    it('should indicate expired credentials', async () => {
      // Arrange
      mockCredentialService.readCredentials = vi.fn().mockResolvedValue({
        access: 'expired-token',
        expires: Math.floor(Date.now() / 1000) - 60,
      });
      mockCredentialService.isExpired = vi.fn().mockReturnValue(true);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/credentials',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        loggedIn: true,
        expired: true,
        expiresAt: expect.any(Number),
      });
    });
  });

  describe('POST /api/credentials/refresh', () => {
    it('should clear cache and re-read credentials', async () => {
      // Arrange
      mockCredentialService.readCredentials = vi.fn().mockResolvedValue({
        access: 'new-token',
      });

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/credentials/refresh',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(mockCredentialService.clearCache).toHaveBeenCalled();
      expect(mockCredentialService.readCredentials).toHaveBeenCalled();
    });
  });
});
```

### 1.5 Sandbox API 路由测试

**测试文件**: `sidecar/src/routes/__tests__/sandboxes.test.ts`

```typescript
// sidecar/src/routes/__tests__/sandboxes.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { sandboxRoutes } from '../sandboxes';
import { DockerService } from '../../services/docker';

describe('Sandbox Routes', () => {
  let app: FastifyInstance;
  let mockDockerService: DockerService;

  beforeEach(async () => {
    mockDockerService = {
      createSandbox: vi.fn(),
      destroySandbox: vi.fn(),
      listSandboxes: vi.fn(),
    } as unknown as DockerService;

    app = Fastify();
    app.decorate('dockerService', mockDockerService);
    await app.register(sandboxRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/sandboxes', () => {
    it('should return list of sandboxes', async () => {
      // Arrange
      const mockSandboxes = [
        { id: 'sb-1', containerId: 'c-1', status: 'running', projectId: 'p-1' },
        { id: 'sb-2', containerId: 'c-2', status: 'exited', projectId: 'p-2' },
      ];
      mockDockerService.listSandboxes = vi.fn().mockResolvedValue(mockSandboxes);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/sandboxes',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(mockSandboxes);
    });
  });

  describe('POST /api/sandboxes', () => {
    it('should create a new sandbox', async () => {
      // Arrange
      const mockSandbox = {
        id: 'new-sandbox',
        containerId: 'new-container',
        status: 'running',
        projectId: 'proj-123',
      };
      mockDockerService.createSandbox = vi.fn().mockResolvedValue(mockSandbox);

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/sandboxes',
        payload: {
          projectId: 'proj-123',
          projectPath: '/path/to/project',
          branch: 'main',
        },
      });

      // Assert
      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual(mockSandbox);
      expect(mockDockerService.createSandbox).toHaveBeenCalledWith({
        projectId: 'proj-123',
        projectPath: '/path/to/project',
        branch: 'main',
      });
    });

    it('should validate required fields', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/sandboxes',
        payload: {
          projectPath: '/path/to/project',
          // missing projectId
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });

    it('should return 500 when creation fails', async () => {
      // Arrange
      mockDockerService.createSandbox = vi.fn().mockRejectedValue(
        new Error('No credentials found')
      );

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/sandboxes',
        payload: {
          projectId: 'proj-123',
          projectPath: '/path/to/project',
        },
      });

      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toContain('No credentials found');
    });
  });

  describe('DELETE /api/sandboxes/:containerId', () => {
    it('should destroy a sandbox', async () => {
      // Arrange
      mockDockerService.destroySandbox = vi.fn().mockResolvedValue(undefined);

      // Act
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/sandboxes/container-123',
      });

      // Assert
      expect(response.statusCode).toBe(204);
      expect(mockDockerService.destroySandbox).toHaveBeenCalledWith('container-123');
    });
  });
});
```

### 1.6 前端 API 客户端测试

**测试文件**: `apps/desktop/src/lib/__tests__/api.test.ts`

```typescript
// apps/desktop/src/lib/__tests__/api.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../api';

describe('API Client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('checkLogin', () => {
    it('should return true when logged in', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ loggedIn: true, expired: false }),
      } as Response);

      // Act
      const result = await api.checkLogin();

      // Assert
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:19876/api/credentials'
      );
    });

    it('should return false when not logged in', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ loggedIn: false }),
      } as Response);

      // Act
      const result = await api.checkLogin();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createSandbox', () => {
    it('should create sandbox with correct payload', async () => {
      // Arrange
      const mockSandbox = {
        id: 'sb-1',
        containerId: 'c-1',
        status: 'running',
        projectId: 'p-1',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockSandbox,
      } as Response);

      // Act
      const result = await api.createSandbox({
        projectId: 'p-1',
        projectPath: '/path/to/project',
        branch: 'main',
      });

      // Assert
      expect(result).toEqual(mockSandbox);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:19876/api/sandboxes',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'p-1',
            projectPath: '/path/to/project',
            branch: 'main',
          }),
        })
      );
    });
  });

  describe('listSandboxes', () => {
    it('should return list of sandboxes', async () => {
      // Arrange
      const mockSandboxes = [
        { id: 'sb-1', containerId: 'c-1', status: 'running', projectId: 'p-1' },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockSandboxes,
      } as Response);

      // Act
      const result = await api.listSandboxes();

      // Assert
      expect(result).toEqual(mockSandboxes);
    });
  });
});
```

### 1.7 前端组件测试 - 登录状态

**测试文件**: `apps/desktop/src/components/__tests__/LoginStatus.test.tsx`

```typescript
// apps/desktop/src/components/__tests__/LoginStatus.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LoginStatus } from '../LoginStatus';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    checkLogin: vi.fn(),
    getCredentials: vi.fn(),
  },
}));

describe('LoginStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    // Arrange
    vi.mocked(api.checkLogin).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    // Act
    render(<LoginStatus />);

    // Assert
    expect(screen.getByText(/检查登录状态/i)).toBeInTheDocument();
  });

  it('should show logged in state', async () => {
    // Arrange
    vi.mocked(api.checkLogin).mockResolvedValue(true);

    // Act
    render(<LoginStatus />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/已登录 Claude Code/i)).toBeInTheDocument();
    });
  });

  it('should show not logged in state', async () => {
    // Arrange
    vi.mocked(api.checkLogin).mockResolvedValue(false);

    // Act
    render(<LoginStatus />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/未登录/i)).toBeInTheDocument();
    });
  });

  it('should show error state on failure', async () => {
    // Arrange
    vi.mocked(api.checkLogin).mockRejectedValue(new Error('Network error'));

    // Act
    render(<LoginStatus />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/无法连接到 Sidecar/i)).toBeInTheDocument();
    });
  });
});
```

---

## Phase 2: 终端体验测试

### 2.1 终端服务测试

**测试文件**: `sidecar/src/services/__tests__/terminal.test.ts`

```typescript
// sidecar/src/services/__tests__/terminal.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TerminalService } from '../terminal';
import { EventEmitter } from 'events';

// Mock node-pty
vi.mock('node-pty', () => ({
  spawn: vi.fn().mockReturnValue({
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
  }),
}));

describe('TerminalService', () => {
  let terminalService: TerminalService;

  beforeEach(() => {
    terminalService = new TerminalService();
    vi.clearAllMocks();
  });

  describe('createTerminal', () => {
    it('should create a new terminal session', () => {
      // Act
      const sessionId = terminalService.createTerminal('sandbox-1', 'container-1');

      // Assert
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
    });

    it('should spawn pty with correct arguments', async () => {
      // Arrange
      const pty = await import('node-pty');

      // Act
      terminalService.createTerminal('sandbox-1', 'container-1');

      // Assert
      expect(pty.spawn).toHaveBeenCalledWith(
        'docker',
        ['exec', '-it', 'container-1', '/bin/bash'],
        expect.objectContaining({
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
        })
      );
    });

    it('should store session in sessions map', () => {
      // Act
      const sessionId = terminalService.createTerminal('sandbox-1', 'container-1');
      const session = terminalService.getSession(sessionId);

      // Assert
      expect(session).toBeDefined();
      expect(session?.sandboxId).toBe('sandbox-1');
    });
  });

  describe('attachWebSocket', () => {
    it('should attach WebSocket to terminal session', () => {
      // Arrange
      const sessionId = terminalService.createTerminal('sandbox-1', 'container-1');
      const mockWs = new EventEmitter() as any;
      mockWs.readyState = 1; // OPEN
      mockWs.send = vi.fn();

      // Act
      terminalService.attachWebSocket(sessionId, mockWs);

      // Assert
      const session = terminalService.getSession(sessionId);
      expect(session?.ws).toBe(mockWs);
    });

    it('should throw error for non-existent session', () => {
      // Arrange
      const mockWs = new EventEmitter() as any;

      // Act & Assert
      expect(() => {
        terminalService.attachWebSocket('non-existent', mockWs);
      }).toThrow('Session not found');
    });
  });

  describe('closeTerminal', () => {
    it('should kill pty and close WebSocket', () => {
      // Arrange
      const sessionId = terminalService.createTerminal('sandbox-1', 'container-1');
      const mockWs = new EventEmitter() as any;
      mockWs.readyState = 1;
      mockWs.send = vi.fn();
      mockWs.close = vi.fn();
      terminalService.attachWebSocket(sessionId, mockWs);

      // Act
      terminalService.closeTerminal(sessionId);

      // Assert
      expect(terminalService.getSession(sessionId)).toBeUndefined();
      expect(mockWs.close).toHaveBeenCalled();
    });

    it('should handle closing non-existent session gracefully', () => {
      // Act & Assert - should not throw
      expect(() => {
        terminalService.closeTerminal('non-existent');
      }).not.toThrow();
    });
  });
});
```

### 2.2 终端组件测试

**测试文件**: `apps/desktop/src/components/terminal/__tests__/Terminal.test.tsx`

```typescript
// apps/desktop/src/components/terminal/__tests__/Terminal.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Terminal } from '../Terminal';

// Mock xterm.js
vi.mock('xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    write: vi.fn(),
    onData: vi.fn(),
    onResize: vi.fn(),
    dispose: vi.fn(),
    loadAddon: vi.fn(),
  })),
}));

vi.mock('xterm-addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
  })),
}));

// Mock WebSocket
class MockWebSocket {
  onmessage: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = 1;
  send = vi.fn();
  close = vi.fn();
}

vi.stubGlobal('WebSocket', MockWebSocket);

describe('Terminal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render terminal container', () => {
    // Act
    const { container } = render(<Terminal sessionId="test-session" />);

    // Assert
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should initialize xterm on mount', async () => {
    // Arrange
    const { Terminal: XTerm } = await import('xterm');

    // Act
    render(<Terminal sessionId="test-session" />);

    // Assert
    expect(XTerm).toHaveBeenCalled();
  });

  it('should connect to WebSocket with correct URL', () => {
    // Act
    render(<Terminal sessionId="my-session-123" />);

    // Assert
    expect(WebSocket).toHaveBeenCalledWith(
      'ws://localhost:19876/ws/terminals/my-session-123'
    );
  });

  it('should dispose terminal on unmount', async () => {
    // Arrange
    const { Terminal: XTerm } = await import('xterm');
    const mockDispose = vi.fn();
    vi.mocked(XTerm).mockImplementation(() => ({
      open: vi.fn(),
      write: vi.fn(),
      onData: vi.fn(),
      onResize: vi.fn(),
      dispose: mockDispose,
      loadAddon: vi.fn(),
    }));

    // Act
    const { unmount } = render(<Terminal sessionId="test-session" />);
    unmount();

    // Assert
    expect(mockDispose).toHaveBeenCalled();
  });
});
```

### 2.3 终端标签页测试

**测试文件**: `apps/desktop/src/components/terminal/__tests__/TerminalTabs.test.tsx`

```typescript
// apps/desktop/src/components/terminal/__tests__/TerminalTabs.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerminalTabs } from '../TerminalTabs';

describe('TerminalTabs', () => {
  const mockOnNewTab = vi.fn();
  const mockOnCloseTab = vi.fn();
  const mockOnSelectTab = vi.fn();

  const defaultProps = {
    tabs: [
      { id: 'tab-1', title: 'Terminal 1', sandboxId: 'sb-1' },
      { id: 'tab-2', title: 'Terminal 2', sandboxId: 'sb-2' },
    ],
    activeTabId: 'tab-1',
    onNewTab: mockOnNewTab,
    onCloseTab: mockOnCloseTab,
    onSelectTab: mockOnSelectTab,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all tabs', () => {
    // Act
    render(<TerminalTabs {...defaultProps} />);

    // Assert
    expect(screen.getByText('Terminal 1')).toBeInTheDocument();
    expect(screen.getByText('Terminal 2')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    // Act
    render(<TerminalTabs {...defaultProps} />);

    // Assert
    const activeTab = screen.getByText('Terminal 1').closest('button');
    expect(activeTab).toHaveClass('active');
  });

  it('should call onSelectTab when clicking a tab', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<TerminalTabs {...defaultProps} />);

    // Act
    await user.click(screen.getByText('Terminal 2'));

    // Assert
    expect(mockOnSelectTab).toHaveBeenCalledWith('tab-2');
  });

  it('should call onNewTab when clicking new tab button', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<TerminalTabs {...defaultProps} />);

    // Act
    await user.click(screen.getByLabelText('新建终端'));

    // Assert
    expect(mockOnNewTab).toHaveBeenCalled();
  });

  it('should call onCloseTab when clicking close button', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<TerminalTabs {...defaultProps} />);

    // Act
    const closeButtons = screen.getAllByLabelText('关闭');
    await user.click(closeButtons[0]);

    // Assert
    expect(mockOnCloseTab).toHaveBeenCalledWith('tab-1');
  });

  it('should handle keyboard shortcut Cmd+T for new tab', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<TerminalTabs {...defaultProps} />);

    // Act
    await user.keyboard('{Meta>}t{/Meta}');

    // Assert
    expect(mockOnNewTab).toHaveBeenCalled();
  });

  it('should handle keyboard shortcut Cmd+W for close tab', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<TerminalTabs {...defaultProps} />);

    // Act
    await user.keyboard('{Meta>}w{/Meta}');

    // Assert
    expect(mockOnCloseTab).toHaveBeenCalledWith('tab-1');
  });
});
```

---

## Phase 3: 项目管理测试

### 3.1 Git 服务测试

**测试文件**: `sidecar/src/services/__tests__/git.test.ts`

```typescript
// sidecar/src/services/__tests__/git.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitService } from '../git';

// Mock simple-git
vi.mock('simple-git', () => {
  const mockGit = {
    clone: vi.fn().mockResolvedValue(undefined),
    branchLocal: vi.fn().mockResolvedValue({ all: ['main', 'develop'] }),
    checkout: vi.fn().mockResolvedValue(undefined),
    checkoutLocalBranch: vi.fn().mockResolvedValue(undefined),
    diff: vi.fn().mockResolvedValue('diff output'),
    add: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    push: vi.fn().mockResolvedValue(undefined),
    status: vi.fn().mockResolvedValue({ files: [] }),
  };

  return {
    default: vi.fn().mockReturnValue(mockGit),
  };
});

describe('GitService', () => {
  let gitService: GitService;

  beforeEach(() => {
    gitService = new GitService();
    vi.clearAllMocks();
  });

  describe('cloneRepository', () => {
    it('should clone repository to specified path', async () => {
      // Arrange
      const simpleGit = (await import('simple-git')).default;
      const mockGit = simpleGit();

      // Act
      await gitService.cloneRepository(
        'https://github.com/user/repo.git',
        '/path/to/clone'
      );

      // Assert
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/path/to/clone',
        []
      );
    });

    it('should clone specific branch when provided', async () => {
      // Arrange
      const simpleGit = (await import('simple-git')).default;
      const mockGit = simpleGit();

      // Act
      await gitService.cloneRepository(
        'https://github.com/user/repo.git',
        '/path/to/clone',
        'develop'
      );

      // Assert
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/path/to/clone',
        ['--branch', 'develop']
      );
    });
  });

  describe('listBranches', () => {
    it('should return list of local branches', async () => {
      // Act
      const branches = await gitService.listBranches('/path/to/repo');

      // Assert
      expect(branches).toEqual(['main', 'develop']);
    });
  });

  describe('checkoutBranch', () => {
    it('should checkout specified branch', async () => {
      // Arrange
      const simpleGit = (await import('simple-git')).default;
      const mockGit = simpleGit();

      // Act
      await gitService.checkoutBranch('/path/to/repo', 'develop');

      // Assert
      expect(mockGit.checkout).toHaveBeenCalledWith('develop');
    });
  });

  describe('createBranch', () => {
    it('should create and checkout new branch', async () => {
      // Arrange
      const simpleGit = (await import('simple-git')).default;
      const mockGit = simpleGit();

      // Act
      await gitService.createBranch('/path/to/repo', 'feature-new');

      // Assert
      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feature-new');
    });
  });

  describe('getDiff', () => {
    it('should return git diff output', async () => {
      // Act
      const diff = await gitService.getDiff('/path/to/repo');

      // Assert
      expect(diff).toBe('diff output');
    });
  });

  describe('commit', () => {
    it('should stage all changes and commit', async () => {
      // Arrange
      const simpleGit = (await import('simple-git')).default;
      const mockGit = simpleGit();

      // Act
      await gitService.commit('/path/to/repo', 'feat: add new feature');

      // Assert
      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith('feat: add new feature');
    });
  });

  describe('push', () => {
    it('should push to remote branch', async () => {
      // Arrange
      const simpleGit = (await import('simple-git')).default;
      const mockGit = simpleGit();

      // Act
      await gitService.push('/path/to/repo', 'feature-new');

      // Assert
      expect(mockGit.push).toHaveBeenCalledWith('origin', 'feature-new');
    });
  });
});
```

### 3.2 文件树组件测试

**测试文件**: `apps/desktop/src/components/project/__tests__/FileTree.test.tsx`

```typescript
// apps/desktop/src/components/project/__tests__/FileTree.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileTree } from '../FileTree';

describe('FileTree', () => {
  const mockOnSelect = vi.fn();

  const mockFiles = {
    name: 'project',
    type: 'directory' as const,
    children: [
      {
        name: 'src',
        type: 'directory' as const,
        children: [
          { name: 'index.ts', type: 'file' as const, path: '/project/src/index.ts' },
          { name: 'utils.ts', type: 'file' as const, path: '/project/src/utils.ts' },
        ],
      },
      { name: 'README.md', type: 'file' as const, path: '/project/README.md' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render root directory', () => {
    // Act
    render(<FileTree files={mockFiles} onSelect={mockOnSelect} />);

    // Assert
    expect(screen.getByText('project')).toBeInTheDocument();
  });

  it('should expand directory on click', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<FileTree files={mockFiles} onSelect={mockOnSelect} />);

    // Act
    await user.click(screen.getByText('src'));

    // Assert
    expect(screen.getByText('index.ts')).toBeInTheDocument();
    expect(screen.getByText('utils.ts')).toBeInTheDocument();
  });

  it('should call onSelect when clicking a file', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<FileTree files={mockFiles} onSelect={mockOnSelect} />);

    // Expand to show files
    await user.click(screen.getByText('src'));

    // Act
    await user.click(screen.getByText('index.ts'));

    // Assert
    expect(mockOnSelect).toHaveBeenCalledWith('/project/src/index.ts');
  });

  it('should show correct icons for files and directories', () => {
    // Act
    render(<FileTree files={mockFiles} onSelect={mockOnSelect} />);

    // Assert
    const folderIcon = screen.getByTestId('folder-icon');
    expect(folderIcon).toBeInTheDocument();
  });

  it('should collapse expanded directory on second click', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<FileTree files={mockFiles} onSelect={mockOnSelect} />);

    // Act - Expand
    await user.click(screen.getByText('src'));
    expect(screen.getByText('index.ts')).toBeInTheDocument();

    // Act - Collapse
    await user.click(screen.getByText('src'));

    // Assert
    expect(screen.queryByText('index.ts')).not.toBeInTheDocument();
  });
});
```

### 3.3 差异查看器测试

**测试文件**: `apps/desktop/src/components/project/__tests__/DiffViewer.test.tsx`

```typescript
// apps/desktop/src/components/project/__tests__/DiffViewer.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffViewer } from '../DiffViewer';

describe('DiffViewer', () => {
  const mockDiff = {
    oldValue: 'const a = 1;\nconst b = 2;',
    newValue: 'const a = 1;\nconst b = 3;\nconst c = 4;',
    fileName: 'test.ts',
  };

  it('should render diff with old and new values', () => {
    // Act
    render(<DiffViewer {...mockDiff} />);

    // Assert
    expect(screen.getByText('const b = 2;')).toBeInTheDocument();
    expect(screen.getByText('const b = 3;')).toBeInTheDocument();
  });

  it('should display file name', () => {
    // Act
    render(<DiffViewer {...mockDiff} />);

    // Assert
    expect(screen.getByText('test.ts')).toBeInTheDocument();
  });

  it('should toggle between split and unified view', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<DiffViewer {...mockDiff} />);

    // Act
    await user.click(screen.getByText('统一视图'));

    // Assert
    expect(screen.getByTestId('unified-view')).toBeInTheDocument();
  });

  it('should highlight added lines in green', () => {
    // Act
    const { container } = render(<DiffViewer {...mockDiff} />);

    // Assert
    const addedLines = container.querySelectorAll('.diff-added');
    expect(addedLines.length).toBeGreaterThan(0);
  });

  it('should highlight removed lines in red', () => {
    // Act
    const { container } = render(<DiffViewer {...mockDiff} />);

    // Assert
    const removedLines = container.querySelectorAll('.diff-removed');
    expect(removedLines.length).toBeGreaterThan(0);
  });
});
```

---

## Phase 4: 多 Sandbox 测试

### 4.1 调度器测试

**测试文件**: `sidecar/src/services/__tests__/scheduler.test.ts`

```typescript
// sidecar/src/services/__tests__/scheduler.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SandboxScheduler } from '../scheduler';
import { DockerService } from '../docker';

describe('SandboxScheduler', () => {
  let scheduler: SandboxScheduler;
  let mockDockerService: DockerService;

  beforeEach(() => {
    mockDockerService = {
      createSandbox: vi.fn().mockImplementation((config) =>
        Promise.resolve({
          id: `sandbox-${Date.now()}`,
          containerId: `container-${Date.now()}`,
          status: 'running',
          projectId: config.projectId,
        })
      ),
      destroySandbox: vi.fn().mockResolvedValue(undefined),
      listSandboxes: vi.fn().mockResolvedValue([]),
    } as unknown as DockerService;

    scheduler = new SandboxScheduler(mockDockerService, 2); // max 2 concurrent
  });

  describe('schedule', () => {
    it('should create sandbox immediately when under limit', async () => {
      // Arrange
      const config = { projectId: 'proj-1', projectPath: '/path/1' };

      // Act
      const result = await scheduler.schedule(config);

      // Assert
      expect(result).not.toBeNull();
      expect(mockDockerService.createSandbox).toHaveBeenCalledWith(config);
    });

    it('should queue when at max concurrent limit', async () => {
      // Arrange
      const config1 = { projectId: 'proj-1', projectPath: '/path/1' };
      const config2 = { projectId: 'proj-2', projectPath: '/path/2' };
      const config3 = { projectId: 'proj-3', projectPath: '/path/3' };

      // Act
      await scheduler.schedule(config1);
      await scheduler.schedule(config2);
      const result3 = await scheduler.schedule(config3);

      // Assert
      expect(result3).toBeNull(); // Should be queued
      expect(mockDockerService.createSandbox).toHaveBeenCalledTimes(2);
    });

    it('should process queue when sandbox completes', async () => {
      // Arrange
      const config1 = { projectId: 'proj-1', projectPath: '/path/1' };
      const config2 = { projectId: 'proj-2', projectPath: '/path/2' };
      const config3 = { projectId: 'proj-3', projectPath: '/path/3' };

      const sandbox1 = await scheduler.schedule(config1);
      await scheduler.schedule(config2);
      await scheduler.schedule(config3); // Queued

      // Act
      await scheduler.onComplete(sandbox1!.id);

      // Assert - config3 should now be created
      expect(mockDockerService.createSandbox).toHaveBeenCalledTimes(3);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      // Arrange
      await scheduler.schedule({ projectId: 'proj-1', projectPath: '/path/1' });
      await scheduler.schedule({ projectId: 'proj-2', projectPath: '/path/2' });
      await scheduler.schedule({ projectId: 'proj-3', projectPath: '/path/3' }); // Queued

      // Act
      const stats = scheduler.getStats();

      // Assert
      expect(stats).toEqual({
        running: 2,
        queued: 1,
        maxConcurrent: 2,
      });
    });
  });
});
```

### 4.2 资源监控测试

**测试文件**: `sidecar/src/services/__tests__/monitor.test.ts`

```typescript
// sidecar/src/services/__tests__/monitor.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceMonitor } from '../monitor';

vi.mock('dockerode', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getContainer: vi.fn().mockReturnValue({
        stats: vi.fn().mockImplementation(({ stream }, callback) => {
          const mockStats = {
            cpu_stats: {
              cpu_usage: { total_usage: 1000000000 },
              system_cpu_usage: 10000000000,
            },
            precpu_stats: {
              cpu_usage: { total_usage: 900000000 },
              system_cpu_usage: 9000000000,
            },
            memory_stats: {
              usage: 512 * 1024 * 1024, // 512MB
              limit: 4 * 1024 * 1024 * 1024, // 4GB
            },
          };
          callback(null, mockStats);
        }),
      }),
    })),
  };
});

describe('ResourceMonitor', () => {
  let monitor: ResourceMonitor;

  beforeEach(() => {
    monitor = new ResourceMonitor();
    vi.clearAllMocks();
  });

  describe('getContainerStats', () => {
    it('should return CPU and memory usage', async () => {
      // Act
      const stats = await monitor.getContainerStats('container-1');

      // Assert
      expect(stats).toMatchObject({
        cpuPercent: expect.any(Number),
        memoryUsageMB: expect.any(Number),
        memoryLimitMB: expect.any(Number),
        memoryPercent: expect.any(Number),
      });
    });

    it('should calculate CPU percentage correctly', async () => {
      // Act
      const stats = await monitor.getContainerStats('container-1');

      // Assert
      // CPU delta = 100M, system delta = 1000M, so 10%
      expect(stats.cpuPercent).toBeCloseTo(10, 0);
    });

    it('should calculate memory percentage correctly', async () => {
      // Act
      const stats = await monitor.getContainerStats('container-1');

      // Assert
      // 512MB / 4096MB = 12.5%
      expect(stats.memoryPercent).toBeCloseTo(12.5, 1);
    });
  });
});
```

---

## Phase 5: 高级功能测试

### 5.1 工作流引擎测试

**测试文件**: `sidecar/src/services/__tests__/workflow.test.ts`

```typescript
// sidecar/src/services/__tests__/workflow.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowEngine, Workflow, WorkflowStep } from '../workflow';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute steps in sequence', async () => {
      // Arrange
      const executionOrder: string[] = [];
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        steps: [
          {
            type: 'shell_command',
            command: 'echo step1',
            onExecute: () => executionOrder.push('step1'),
          } as any,
          {
            type: 'shell_command',
            command: 'echo step2',
            onExecute: () => executionOrder.push('step2'),
          } as any,
        ],
      };

      // Act
      await engine.execute(workflow);

      // Assert
      expect(executionOrder).toEqual(['step1', 'step2']);
    });

    it('should execute parallel steps concurrently', async () => {
      // Arrange
      const startTimes: Record<string, number> = {};
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Parallel Workflow',
        steps: [
          {
            type: 'parallel',
            steps: [
              {
                type: 'shell_command',
                command: 'sleep 0.1',
                onExecute: () => {
                  startTimes['a'] = Date.now();
                },
              },
              {
                type: 'shell_command',
                command: 'sleep 0.1',
                onExecute: () => {
                  startTimes['b'] = Date.now();
                },
              },
            ],
          } as any,
        ],
      };

      // Act
      await engine.execute(workflow);

      // Assert - Both should start at nearly the same time
      expect(Math.abs(startTimes['a'] - startTimes['b'])).toBeLessThan(50);
    });

    it('should handle step failure gracefully', async () => {
      // Arrange
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Failing Workflow',
        steps: [
          {
            type: 'shell_command',
            command: 'exit 1',
          },
        ],
      };

      // Act & Assert
      await expect(engine.execute(workflow)).rejects.toThrow();
    });
  });

  describe('pause and resume', () => {
    it('should pause workflow execution', async () => {
      // Arrange
      let stepCount = 0;
      const workflow: Workflow = {
        id: 'wf-pausable',
        name: 'Pausable Workflow',
        steps: [
          { type: 'shell_command', command: 'echo 1' },
          { type: 'shell_command', command: 'echo 2' },
          { type: 'shell_command', command: 'echo 3' },
        ],
      };

      // Start execution
      const executionPromise = engine.execute(workflow);

      // Act - Pause after first step
      setTimeout(() => engine.pause('wf-pausable'), 10);

      // Assert - Execution should be paused
      const status = engine.getStatus('wf-pausable');
      expect(status).toBe('paused');
    });
  });

  describe('cancel', () => {
    it('should cancel running workflow', async () => {
      // Arrange
      const workflow: Workflow = {
        id: 'wf-cancel',
        name: 'Long Workflow',
        steps: [
          { type: 'shell_command', command: 'sleep 10' },
        ],
      };

      // Start execution
      const executionPromise = engine.execute(workflow);

      // Act
      engine.cancel('wf-cancel');

      // Assert
      await expect(executionPromise).rejects.toThrow('cancelled');
    });
  });
});
```

### 5.2 录制服务测试

**测试文件**: `sidecar/src/services/__tests__/recording.test.ts`

```typescript
// sidecar/src/services/__tests__/recording.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecordingService } from '../recording';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('RecordingService', () => {
  let recordingService: RecordingService;

  beforeEach(() => {
    recordingService = new RecordingService();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startRecording', () => {
    it('should create a new recording session', () => {
      // Act
      const recordingId = recordingService.startRecording('terminal-1');

      // Assert
      expect(recordingId).toBeDefined();
      expect(recordingService.isRecording('terminal-1')).toBe(true);
    });

    it('should throw if already recording', () => {
      // Arrange
      recordingService.startRecording('terminal-1');

      // Act & Assert
      expect(() => {
        recordingService.startRecording('terminal-1');
      }).toThrow('Already recording');
    });
  });

  describe('recordOutput', () => {
    it('should record output with timestamp', () => {
      // Arrange
      recordingService.startRecording('terminal-1');
      vi.setSystemTime(new Date('2026-01-28T10:00:00Z'));

      // Act
      recordingService.recordOutput('terminal-1', 'Hello, World!');
      vi.advanceTimersByTime(1000);
      recordingService.recordOutput('terminal-1', 'Second line');

      // Assert
      const recording = recordingService.getRecording('terminal-1');
      expect(recording?.events).toHaveLength(2);
      expect(recording?.events[0]).toEqual({
        time: 0,
        type: 'o',
        data: 'Hello, World!',
      });
      expect(recording?.events[1]).toEqual({
        time: 1,
        type: 'o',
        data: 'Second line',
      });
    });
  });

  describe('stopRecording', () => {
    it('should stop recording and return data', () => {
      // Arrange
      recordingService.startRecording('terminal-1');
      recordingService.recordOutput('terminal-1', 'test output');

      // Act
      const recording = recordingService.stopRecording('terminal-1');

      // Assert
      expect(recording).toBeDefined();
      expect(recordingService.isRecording('terminal-1')).toBe(false);
    });
  });

  describe('saveRecording', () => {
    it('should save recording in asciinema format', async () => {
      // Arrange
      recordingService.startRecording('terminal-1');
      recordingService.recordOutput('terminal-1', 'test');
      const recording = recordingService.stopRecording('terminal-1');

      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Act
      await recordingService.saveRecording(recording!, '/path/to/recording.cast');

      // Assert
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/path/to/recording.cast',
        expect.stringContaining('"version": 2'),
        'utf-8'
      );
    });
  });
});
```

---

## Phase 6: 发布测试

### 6.1 E2E 测试配置

**配置文件**: `apps/desktop/playwright.config.ts`

```typescript
// apps/desktop/playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 6.2 关键用户流程 E2E 测试

**测试文件**: `apps/desktop/e2e/specs/critical-flows.spec.ts`

```typescript
// apps/desktop/e2e/specs/critical-flows.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login status on homepage', async ({ page }) => {
    // Assert - Either logged in or not logged in message
    await expect(
      page.getByText(/已登录|未登录/).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display sandbox list', async ({ page }) => {
    // Navigate to sandboxes
    await page.click('text=Sandbox');

    // Assert
    await expect(page.getByTestId('sandbox-list')).toBeVisible();
  });

  test('should create new sandbox', async ({ page }) => {
    // Prerequisites: Must be logged in

    // Navigate to create sandbox
    await page.click('text=新建 Sandbox');

    // Fill form
    await page.fill('[name="projectPath"]', '/tmp/test-project');
    await page.fill('[name="projectId"]', 'test-project');

    // Submit
    await page.click('button[type="submit"]');

    // Assert - New sandbox should appear
    await expect(page.getByText('test-project')).toBeVisible({ timeout: 30000 });
  });

  test('should open terminal for sandbox', async ({ page }) => {
    // Prerequisites: Must have at least one sandbox

    // Click on sandbox
    await page.click('[data-testid="sandbox-card"]');

    // Click open terminal
    await page.click('text=打开终端');

    // Assert - Terminal should be visible
    await expect(page.locator('.xterm')).toBeVisible({ timeout: 10000 });
  });

  test('should type in terminal and see output', async ({ page }) => {
    // Prerequisites: Terminal must be open

    // Focus terminal
    await page.click('.xterm');

    // Type command
    await page.keyboard.type('echo "Hello E2E"');
    await page.keyboard.press('Enter');

    // Assert - Output should appear
    await expect(page.locator('.xterm')).toContainText('Hello E2E');
  });
});
```

### 6.3 应用启动测试

**测试文件**: `apps/desktop/e2e/specs/app-startup.spec.ts`

```typescript
// apps/desktop/e2e/specs/app-startup.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Application Startup', () => {
  test('should load the application', async ({ page }) => {
    // Act
    await page.goto('/');

    // Assert
    await expect(page).toHaveTitle(/AnyCode/);
  });

  test('should connect to sidecar', async ({ page }) => {
    // Act
    await page.goto('/');

    // Assert - Should not show connection error
    await expect(page.getByText('无法连接到 Sidecar')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('should display main navigation', async ({ page }) => {
    // Act
    await page.goto('/');

    // Assert
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByText('项目')).toBeVisible();
    await expect(page.getByText('Sandbox')).toBeVisible();
    await expect(page.getByText('设置')).toBeVisible();
  });
});
```

---

## 持续集成测试

### GitHub Actions 工作流

```yaml
# .github/workflows/test.yml

name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # 单元测试和组件测试
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run Sidecar tests
        run: pnpm --filter @anycode/sidecar test:coverage

      - name: Run Frontend tests
        run: pnpm --filter @anycode/desktop test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/desktop/sidecar/coverage/lcov.info,./apps/desktop/coverage/lcov.info

  # 集成测试
  integration-tests:
    runs-on: ubuntu-latest
    services:
      docker:
        image: docker:dind
        options: --privileged
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run integration tests
        run: pnpm --filter @anycode/sidecar test:integration

  # E2E 测试
  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm --filter @anycode/desktop exec playwright install --with-deps

      - name: Build application
        run: pnpm build

      - name: Run E2E tests
        run: pnpm --filter @anycode/desktop test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: apps/desktop/playwright-report/
```

---

## 测试覆盖率要求

### 各模块覆盖率目标

| 模块 | 语句覆盖 | 分支覆盖 | 函数覆盖 | 行覆盖 |
|------|----------|----------|----------|--------|
| Sidecar Services | 85% | 80% | 85% | 85% |
| Sidecar Routes | 80% | 75% | 80% | 80% |
| Frontend Components | 75% | 70% | 75% | 75% |
| Frontend Hooks | 80% | 75% | 80% | 80% |
| Shared Libraries | 90% | 85% | 90% | 90% |

### 覆盖率报告

```bash
# 生成覆盖率报告
pnpm test:coverage

# 查看 HTML 报告
open coverage/index.html
```

### 排除覆盖率的文件

```typescript
// vitest.config.ts coverage.exclude
[
  'node_modules/',
  'test/',
  '**/*.d.ts',
  '**/types/**',
  'src/main.tsx',        // 入口文件
  '**/__mocks__/**',     // Mock 文件
  '**/fixtures/**',      // 测试数据
]
```

---

## 测试命名规范

### 测试文件命名

```
服务测试:      src/services/__tests__/[service-name].test.ts
路由测试:      src/routes/__tests__/[route-name].test.ts
组件测试:      src/components/__tests__/[ComponentName].test.tsx
集成测试:      test/integration/[feature].integration.test.ts
E2E 测试:      e2e/specs/[feature].spec.ts
```

### 测试用例命名

```typescript
describe('[被测模块名]', () => {
  describe('[方法名/功能名]', () => {
    it('should [预期行为] when [条件/场景]', () => {
      // ...
    });
  });
});

// 示例
describe('CredentialService', () => {
  describe('readCredentials', () => {
    it('should return null when no credentials exist', () => {});
    it('should read from Keychain when available', () => {});
    it('should fall back to file when Keychain fails', () => {});
  });
});
```

---

## 测试最佳实践

### 1. Arrange-Act-Assert 模式

```typescript
it('should create sandbox with correct configuration', async () => {
  // Arrange - 准备测试数据和 Mock
  const config = { projectId: 'test', projectPath: '/path' };
  mockDocker.createContainer.mockResolvedValue({ id: 'container-1' });

  // Act - 执行被测代码
  const result = await dockerService.createSandbox(config);

  // Assert - 验证结果
  expect(result.containerId).toBe('container-1');
});
```

### 2. 单一职责

每个测试只测试一件事：

```typescript
// 好
it('should return null when Keychain is empty', () => {});
it('should fall back to file when Keychain fails', () => {});

// 不好
it('should handle Keychain empty and file fallback', () => {});
```

### 3. 避免测试实现细节

```typescript
// 好 - 测试行为
it('should return credentials when logged in', async () => {
  const result = await service.readCredentials();
  expect(result).toHaveProperty('access');
});

// 不好 - 测试实现
it('should call keytar.getPassword with correct arguments', async () => {
  await service.readCredentials();
  expect(keytar.getPassword).toHaveBeenCalledWith('Claude Code-credentials', 'default');
});
```

### 4. 使用工厂函数创建测试数据

```typescript
// test/fixtures/credentials.ts
export function createMockCredentials(overrides = {}) {
  return {
    access: 'test-access-token',
    refresh: 'test-refresh-token',
    expires: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

// 使用
it('should detect expired credentials', () => {
  const expiredCreds = createMockCredentials({
    expires: Math.floor(Date.now() / 1000) - 60,
  });
  expect(service.isExpired(expiredCreds)).toBe(true);
});
```

---

*文档版本: 1.0*
*最后更新: 2026-01-28*
