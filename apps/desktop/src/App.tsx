import { useEffect, useState } from 'react';
import { api, type CredentialStatus, type SandboxInfo } from './lib/api';

function App() {
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | null>(null);
  const [dockerConnected, setDockerConnected] = useState<boolean | null>(null);
  const [sandboxes, setSandboxes] = useState<SandboxInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">无法连接到 Sidecar</div>
          <div className="text-gray-400 text-sm mb-4">{error}</div>
          <button
            onClick={loadStatus}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">AnyCode</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Claude Code Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Claude Code</h2>
          {credentialStatus?.loggedIn ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>已登录</span>
              {credentialStatus.expired && (
                <span className="text-yellow-500 text-sm">(凭证已过期)</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>未登录</span>
              <span className="text-gray-400 text-sm">
                请先运行 <code className="bg-gray-700 px-1 rounded">claude login</code>
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
              <span>已连接</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>未连接</span>
              <span className="text-gray-400 text-sm">请启动 Docker Desktop</span>
            </div>
          )}
        </div>
      </div>

      {/* Sandboxes */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Sandboxes</h2>
          <button
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={!credentialStatus?.loggedIn || !dockerConnected}
          >
            新建 Sandbox
          </button>
        </div>

        {sandboxes.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            暂无 Sandbox，点击上方按钮创建
          </div>
        ) : (
          <div className="space-y-4">
            {sandboxes.map((sandbox) => (
              <div
                key={sandbox.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded"
              >
                <div>
                  <div className="font-medium">{sandbox.projectId}</div>
                  <div className="text-sm text-gray-400">{sandbox.containerId.slice(0, 12)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      sandbox.status === 'running'
                        ? 'bg-green-600'
                        : 'bg-gray-600'
                    }`}
                  >
                    {sandbox.status}
                  </span>
                  <button className="text-red-400 hover:text-red-300">删除</button>
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
          刷新状态
        </button>
      </div>
    </div>
  );
}

export default App;
