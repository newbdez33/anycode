import keytar from 'keytar';
import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import type { ClaudeCredentials, CredentialStatus } from '../types/index.js';
import { logger } from '../lib/logger.js';

const KEYCHAIN_SERVICE = 'Claude Code-credentials';
// Account name can vary - try common patterns
const KEYCHAIN_ACCOUNTS = ['default', process.env.USER, process.env.USERNAME, 'claude'];
const CREDENTIAL_FILE = '.credentials.json';
const CLAUDE_DIR = '.claude';
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

interface CredentialCache {
  credentials: ClaudeCredentials | null;
  cachedAt: number;
}

export class CredentialService {
  private cache: CredentialCache | null = null;

  /**
   * Read Claude Code credentials from Keychain or file
   * Priority: Cache > Keychain > File
   */
  async readCredentials(): Promise<ClaudeCredentials | null> {
    // Check cache
    if (this.cache && Date.now() - this.cache.cachedAt < CACHE_TTL_MS) {
      return this.cache.credentials;
    }

    let credentials: ClaudeCredentials | null = null;

    // 1. Try Keychain
    credentials = await this.readFromKeychain();

    // 2. Fall back to file
    if (!credentials) {
      credentials = await this.readFromFile();
    }

    // Update cache
    this.cache = {
      credentials,
      cachedAt: Date.now(),
    };

    return credentials;
  }

  /**
   * Read credentials from system Keychain
   */
  private async readFromKeychain(): Promise<ClaudeCredentials | null> {
    // Try each possible account name
    for (const account of KEYCHAIN_ACCOUNTS) {
      if (!account) continue;

      try {
        const secret = await keytar.getPassword(KEYCHAIN_SERVICE, account);
        if (secret) {
          const parsed = JSON.parse(secret);
          const credentials = this.normalizeCredentials(parsed);
          if (credentials) {
            logger.debug({ account }, 'Found credentials in Keychain');
            return credentials;
          }
        }
      } catch (error) {
        logger.debug({ error, account }, 'Failed to read from Keychain');
      }
    }

    return null;
  }

  /**
   * Read credentials from ~/.claude/.credentials.json
   */
  private async readFromFile(): Promise<ClaudeCredentials | null> {
    try {
      const credPath = path.join(homedir(), CLAUDE_DIR, CREDENTIAL_FILE);
      const content = await fs.readFile(credPath, 'utf-8');
      const parsed = JSON.parse(content);
      return this.normalizeCredentials(parsed);
    } catch (error) {
      logger.debug({ error }, 'Failed to read from file');
      return null;
    }
  }

  /**
   * Normalize credential format (handle different field names and structures)
   */
  private normalizeCredentials(raw: Record<string, unknown>): ClaudeCredentials | null {
    // Handle nested claudeAiOauth structure
    let data = raw;
    if (raw.claudeAiOauth && typeof raw.claudeAiOauth === 'object') {
      data = raw.claudeAiOauth as Record<string, unknown>;
    }

    const access = (data.access || data.accessToken) as string | undefined;

    if (!access) {
      return null;
    }

    return {
      access,
      refresh: (data.refresh || data.refreshToken) as string | undefined,
      expires: (data.expires || data.expiresAt) as number | undefined,
    };
  }

  /**
   * Check if credentials are expired (with 5 minute buffer)
   */
  isExpired(credentials: ClaudeCredentials): boolean {
    if (!credentials.expires) {
      return false;
    }

    const expiresAtMs = credentials.expires * 1000;
    const nowWithBuffer = Date.now() + EXPIRY_BUFFER_MS;

    return nowWithBuffer > expiresAtMs;
  }

  /**
   * Get credential status for API response
   */
  async getStatus(): Promise<CredentialStatus> {
    const credentials = await this.readCredentials();

    if (!credentials) {
      return {
        loggedIn: false,
        expired: false,
        expiresAt: null,
      };
    }

    return {
      loggedIn: true,
      expired: this.isExpired(credentials),
      expiresAt: credentials.expires ?? null,
    };
  }

  /**
   * Clear the credential cache
   */
  clearCache(): void {
    this.cache = null;
  }
}
