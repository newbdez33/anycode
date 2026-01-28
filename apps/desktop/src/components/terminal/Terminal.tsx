/**
 * Terminal Component - Phase 2
 *
 * xterm.js based terminal that connects to the backend via WebSocket.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export interface TerminalProps {
  sessionId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const SIDECAR_WS_URL = 'ws://127.0.0.1:19876';

export function Terminal({
  sessionId,
  onConnected,
  onDisconnected,
  onError,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  // Initialize terminal and WebSocket
  useEffect(() => {
    if (!containerRef.current) return;

    // Create xterm instance
    const terminal = new XTerm({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
      },
    });

    // Create and load fit addon
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // Open terminal in container
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Connect to WebSocket
    const ws = new WebSocket(`${SIDECAR_WS_URL}/ws/terminals/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      onConnected?.();
      terminal.focus();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'output':
            terminal.write(message.data);
            break;
          case 'connected':
            // Connection confirmed by server
            break;
          case 'exit':
            setStatus('disconnected');
            terminal.write('\r\n\x1b[33m[Process exited]\x1b[0m\r\n');
            break;
          case 'pong':
            // Keepalive response
            break;
        }
      } catch {
        // Raw data (shouldn't happen with our protocol)
        terminal.write(event.data);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      onDisconnected?.();
    };

    ws.onerror = (event) => {
      setStatus('error');
      onError?.(new Error('WebSocket connection failed'));
    };

    // Handle user input
    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle terminal resize
    terminal.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      terminal.dispose();
    };
  }, [sessionId, onConnected, onDisconnected, onError]);

  // Focus terminal
  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  // Fit terminal to container
  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  return (
    <div className="relative h-full w-full bg-[#1e1e1e]">
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] text-gray-400 z-10">
          Connecting...
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] text-red-400 z-10">
          Connection failed
        </div>
      )}

      {status === 'disconnected' && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-600 text-white text-xs rounded z-10">
          Disconnected
        </div>
      )}

      <div
        ref={containerRef}
        data-testid="terminal-container"
        className="h-full w-full"
        onClick={focus}
      />
    </div>
  );
}
