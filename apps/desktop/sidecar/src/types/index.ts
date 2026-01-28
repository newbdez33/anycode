// Credential types
export interface ClaudeCredentials {
  access: string;
  refresh?: string;
  expires?: number;
}

export interface CredentialStatus {
  loggedIn: boolean;
  expired: boolean;
  expiresAt: number | null;
}

// Sandbox types
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
  createdAt?: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Terminal types
export interface TerminalSession {
  id: string;
  sandboxId: string;
  containerId: string;
  createdAt: number;
}

export interface TerminalMessage {
  type: 'input' | 'output' | 'resize';
  data?: string;
  cols?: number;
  rows?: number;
}
