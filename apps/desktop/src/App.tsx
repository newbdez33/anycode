import { useEffect, useState, useCallback } from 'react';
import { api, type CredentialStatus, type SandboxInfo } from './lib/api';
import { Terminal } from './components/terminal/Terminal';
import { TerminalTabs, type TerminalTab } from './components/terminal/TerminalTabs';

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string;
}

function App() {
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | null>(null);
  const [dockerConnected, setDockerConnected] = useState<boolean | null>(null);
  const [sandboxes, setSandboxes] = useState<SandboxInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSandbox, setSelectedSandbox] = useState<SandboxInfo | null>(null);
  const [terminalState, setTerminalState] = useState<TerminalState>({
    tabs: [],
    activeTabId: '',
  });
  const [creatingTerminal, setCreatingTerminal] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    setError(null);

    try {
      const [creds, docker, sbs] = await Promise.all([
        api.getCredentialStatus(),
        api.getDockerStatus(),
        api.listSandboxes(),
      ]);

      setCredentialStatus(creds);
      setDockerConnected(docker.connected);
      setSandboxes(sbs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Sidecar');
    } finally {
      setLoading(false);
    }
  }

  async function createSandbox() {
    try {
      const projectId = `project-${Date.now()}`;
      const sandbox = await api.createSandbox({
        projectId,
        projectPath: `~/.anycode/projects/${projectId}`,
      });
      setSandboxes((prev) => [...prev, sandbox]);
      setSelectedSandbox(sandbox);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sandbox');
    }
  }

  async function destroySandbox(containerId: string) {
    try {
      await api.destroySandbox(containerId);
      setSandboxes((prev) => prev.filter((s) => s.containerId !== containerId));
      if (selectedSandbox?.containerId === containerId) {
        setSelectedSandbox(null);
        setTerminalState({ tabs: [], activeTabId: '' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to destroy sandbox');
    }
  }

  const createTerminal = useCallback(async () => {
    if (!selectedSandbox) return;

    setCreatingTerminal(true);
    try {
      const { sessionId } = await api.createTerminal({
        sandboxId: selectedSandbox.id,
        containerId: selectedSandbox.containerId,
      });

      const newTab: TerminalTab = {
        id: sessionId,
        title: `Terminal ${terminalState.tabs.length + 1}`,
        sessionId,
      };

      setTerminalState((prev) => ({
        tabs: [...prev.tabs, newTab],
        activeTabId: sessionId,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create terminal');
    } finally {
      setCreatingTerminal(false);
    }
  }, [selectedSandbox, terminalState.tabs.length]);

  const closeTerminal = useCallback(async (tabId: string) => {
    try {
      await api.closeTerminal(tabId);
    } catch {
      // Ignore close errors
    }

    setTerminalState((prev) => {
      const newTabs = prev.tabs.filter((t) => t.id !== tabId);
      let newActiveId = prev.activeTabId;

      if (prev.activeTabId === tabId) {
        const index = prev.tabs.findIndex((t) => t.id === tabId);
        newActiveId = newTabs[Math.max(0, index - 1)]?.id || '';
      }

      return { tabs: newTabs, activeTabId: newActiveId };
    });
  }, []);

  const selectTerminal = useCallback((tabId: string) => {
    setTerminalState((prev) => ({ ...prev, activeTabId: tabId }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Cannot connect to Sidecar</div>
          <div className="text-gray-400 text-sm mb-4">{error}</div>
          <button
            onClick={() => { setError(null); loadStatus(); }}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Terminal view when sandbox is selected
  if (selectedSandbox) {
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedSandbox(null);
                setTerminalState({ tabs: [], activeTabId: '' });
              }}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <span className="font-semibold">{selectedSandbox.projectId}</span>
            <span className="text-gray-500 text-sm">
              {selectedSandbox.containerId.slice(0, 12)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs ${
                selectedSandbox.status === 'running' ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              {selectedSandbox.status}
            </span>
          </div>
        </div>

        {/* Terminal Tabs */}
        <TerminalTabs
          tabs={terminalState.tabs}
          activeTabId={terminalState.activeTabId}
          onNewTab={createTerminal}
          onCloseTab={closeTerminal}
          onSelectTab={selectTerminal}
        />

        {/* Terminal Content */}
        <div className="flex-1 relative">
          {terminalState.tabs.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="mb-4">No terminals open</p>
                <button
                  onClick={createTerminal}
                  disabled={creatingTerminal}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingTerminal ? 'Creating...' : 'Open Terminal'}
                </button>
              </div>
            </div>
          ) : (
            terminalState.tabs.map((tab) => (
              <div
                key={tab.id}
                className={`absolute inset-0 ${
                  tab.id === terminalState.activeTabId ? 'block' : 'hidden'
                }`}
              >
                <Terminal sessionId={tab.sessionId} />
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">AnyCode</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Claude Code Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Claude Code</h2>
          {credentialStatus?.loggedIn ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Logged in</span>
              {credentialStatus.expired && (
                <span className="text-yellow-500 text-sm">(credentials expired)</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>Not logged in</span>
              <span className="text-gray-400 text-sm">
                Please run <code className="bg-gray-700 px-1 rounded">claude login</code>
              </span>
            </div>
          )}
        </div>

        {/* Docker Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Docker</h2>
          {dockerConnected ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>Not connected</span>
              <span className="text-gray-400 text-sm">Please start Docker Desktop</span>
            </div>
          )}
        </div>
      </div>

      {/* Sandboxes */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Sandboxes</h2>
          <button
            onClick={createSandbox}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={!credentialStatus?.loggedIn || !dockerConnected}
          >
            New Sandbox
          </button>
        </div>

        {sandboxes.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No sandboxes yet. Click the button above to create one.
          </div>
        ) : (
          <div className="space-y-4">
            {sandboxes.map((sandbox) => (
              <div
                key={sandbox.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded hover:bg-gray-650 cursor-pointer"
                onClick={() => setSelectedSandbox(sandbox)}
              >
                <div>
                  <div className="font-medium">{sandbox.projectId}</div>
                  <div className="text-sm text-gray-400">
                    {sandbox.containerId.slice(0, 12)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      sandbox.status === 'running' ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    {sandbox.status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      destroySandbox(sandbox.containerId);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={loadStatus}
          className="text-gray-400 hover:text-white text-sm"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}

export default App;
