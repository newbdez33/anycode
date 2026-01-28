import Docker from 'dockerode';
import { v4 as uuid } from 'uuid';
import type { SandboxConfig, SandboxInfo } from '../types/index.js';
import type { CredentialService } from './credentials.js';
import { logger } from '../lib/logger.js';

const SANDBOX_IMAGE = 'anycode/sandbox:latest';
const CONTAINER_LABEL = 'app=anycode-sandbox';

export class DockerService {
  private docker: Docker;
  private credentialService: CredentialService;

  constructor(credentialService: CredentialService) {
    this.docker = new Docker();
    this.credentialService = credentialService;
  }

  /**
   * Create a new sandbox container
   */
  async createSandbox(config: SandboxConfig): Promise<SandboxInfo> {
    const credentials = await this.credentialService.readCredentials();
    if (!credentials) {
      throw new Error('No credentials found. Please login to Claude Code first.');
    }

    const sandboxId = uuid();
    const containerName = `anycode-${sandboxId.slice(0, 8)}`;

    logger.info({ sandboxId, projectId: config.projectId }, 'Creating sandbox');

    // Environment variables
    const env = [
      `SANDBOX_ID=${sandboxId}`,
      `PROJECT_ID=${config.projectId}`,
      `ANTHROPIC_API_KEY=${credentials.access}`,
    ];

    if (config.branch) {
      env.push(`GIT_BRANCH=${config.branch}`);
    }

    // Create container
    const container = await this.docker.createContainer({
      Image: SANDBOX_IMAGE,
      name: containerName,
      Env: env,
      HostConfig: {
        Memory: 4 * 1024 * 1024 * 1024, // 4GB
        NanoCpus: 2_000_000_000, // 2 CPU
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

    // Start container
    await container.start();

    logger.info({ sandboxId, containerId: container.id }, 'Sandbox created');

    return {
      id: sandboxId,
      containerId: container.id,
      status: 'running',
      projectId: config.projectId,
      createdAt: Date.now(),
    };
  }

  /**
   * Destroy a sandbox container
   */
  async destroySandbox(containerId: string): Promise<void> {
    logger.info({ containerId }, 'Destroying sandbox');

    const container = this.docker.getContainer(containerId);

    try {
      await container.stop();
    } catch {
      // Container may already be stopped
    }

    await container.remove({ force: true });

    logger.info({ containerId }, 'Sandbox destroyed');
  }

  /**
   * List all sandbox containers
   */
  async listSandboxes(): Promise<SandboxInfo[]> {
    const containers = await this.docker.listContainers({
      all: true,
      filters: { label: [CONTAINER_LABEL] },
    });

    return containers
      .map((c) => ({
        id: c.Labels?.sandbox_id || '',
        containerId: c.Id,
        status: c.State || 'unknown',
        projectId: c.Labels?.project_id || '',
        createdAt: c.Created ? c.Created * 1000 : undefined,
      }))
      .filter((s) => s.id); // Filter out containers without sandbox_id
  }

  /**
   * Check if Docker is available
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }
}
