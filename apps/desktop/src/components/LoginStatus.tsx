import { useEffect, useState } from 'react';
import { api, type CredentialStatus } from '../lib/api';

export type LoginStatusState = 'loading' | 'logged_in' | 'logged_out' | 'expired' | 'error';

export interface LoginStatusProps {
  onStatusChange?: (status: LoginStatusState) => void;
}

export function LoginStatus({ onStatusChange }: LoginStatusProps) {
  const [status, setStatus] = useState<LoginStatusState>('loading');
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  async function checkStatus() {
    setStatus('loading');
    setError(null);

    try {
      const creds = await api.getCredentialStatus();
      setCredentialStatus(creds);

      if (!creds.loggedIn) {
        setStatus('logged_out');
      } else if (creds.expired) {
        setStatus('expired');
      } else {
        setStatus('logged_in');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setStatus('error');
    }
  }

  if (status === 'loading') {
    return (
      <div className="bg-gray-800 rounded-lg p-6" data-testid="login-status">
        <h2 className="text-lg font-semibold mb-4">Claude Code</h2>
        <div className="flex items-center gap-2 text-gray-400">
          <span className="w-3 h-3 rounded-full bg-gray-500 animate-pulse"></span>
          <span>Checking login status...</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-gray-800 rounded-lg p-6" data-testid="login-status">
        <h2 className="text-lg font-semibold mb-4">Claude Code</h2>
        <div className="flex items-center gap-2 text-red-400">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span>Cannot connect to Sidecar</span>
        </div>
        {error && <div className="text-gray-400 text-sm mt-2">{error}</div>}
        <button
          onClick={checkStatus}
          className="mt-3 px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === 'logged_out') {
    return (
      <div className="bg-gray-800 rounded-lg p-6" data-testid="login-status">
        <h2 className="text-lg font-semibold mb-4">Claude Code</h2>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span>Not logged in</span>
        </div>
        <div className="text-gray-400 text-sm mt-2">
          Please run <code className="bg-gray-700 px-1 rounded">claude login</code> first
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="bg-gray-800 rounded-lg p-6" data-testid="login-status">
        <h2 className="text-lg font-semibold mb-4">Claude Code</h2>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span>Logged in to Claude Code</span>
          <span className="text-yellow-500 text-sm">(credentials expired)</span>
        </div>
        <div className="text-gray-400 text-sm mt-2">
          Please run <code className="bg-gray-700 px-1 rounded">claude login</code> to refresh credentials
        </div>
      </div>
    );
  }

  // logged_in
  return (
    <div className="bg-gray-800 rounded-lg p-6" data-testid="login-status">
      <h2 className="text-lg font-semibold mb-4">Claude Code</h2>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-green-500"></span>
        <span>Logged in to Claude Code</span>
      </div>
      {credentialStatus?.expiresAt && (
        <div className="text-gray-400 text-sm mt-2">
          Valid until: {new Date(credentialStatus.expiresAt * 1000).toLocaleString()}
        </div>
      )}
    </div>
  );
}
