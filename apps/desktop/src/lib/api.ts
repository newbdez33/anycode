const SIDECAR_URL = 'http://127.0.0.1:19876';

export interface CredentialStatus {
  loggedIn: boolean;
  expired: boolean;
  expiresAt: number | null;
}

export interface DockerStatus {
  connected: boolean;
}

export interface SandboxInfo {
  id: string;
  containerId: string;
  status: string;
  projectId: string;
  createdAt?: number;
}

export interface SandboxConfig {
  projectId: string;
  projectPath: string;
  branch?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = SIDECAR_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Credentials API
  async getCredentialStatus(): Promise<CredentialStatus> {
    return this.fetch<CredentialStatus>('/api/credentials');
  }

  async refreshCredentials(): Promise<CredentialStatus> {
    return this.fetch<CredentialStatus>('/api/credentials/refresh', {
      method: 'POST',
    });
  }

  // Docker API
  async getDockerStatus(): Promise<DockerStatus> {
    return this.fetch<DockerStatus>('/api/sandboxes/docker-status');
  }

  // Sandbox API
  async listSandboxes(): Promise<SandboxInfo[]> {
    return this.fetch<SandboxInfo[]>('/api/sandboxes');
  }

  async createSandbox(config: SandboxConfig): Promise<SandboxInfo> {
    return this.fetch<SandboxInfo>('/api/sandboxes', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async destroySandbox(containerId: string): Promise<void> {
    return this.fetch<void>(`/api/sandboxes/${containerId}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async checkHealth(): Promise<{ status: string; timestamp: number }> {
    return this.fetch('/health');
  }
}

export const api = new ApiClient();
