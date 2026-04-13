import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useAppStore } from '@/store';

interface Props {
  runId?: number | null;
}

export function TerminalPanel({ runId: _runId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const prevLenRef = useRef(0);

  // Read log lines from Zustand — written by useRunEvents (single source of truth)
  const agentLogs = useAppStore((s) => s.agentLogs);
  const clearAgentLogs = useAppStore((s) => s.clearAgentLogs);

  useEffect(() => {
    const term = new Terminal({
      theme: {
        background: '#09090b',
        foreground: '#d4d4d8',
        cursor: '#a1a1aa',
        selectionBackground: '#3f3f46',
      },
      fontSize: 12,
      fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
      convertEol: true,
      scrollback: 5000,
      cursorBlink: false,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    if (containerRef.current) {
      term.open(containerRef.current);
      try { fitAddon.fit(); } catch { /* ignore first-frame layout issue */ }
    }
    termRef.current = term;
    fitRef.current = fitAddon;
    prevLenRef.current = 0;

    const ro = new ResizeObserver(() => {
      try { fitRef.current?.fit(); } catch { /* ignore */ }
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // Write new log lines to terminal as they arrive in the store
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    const newLines = agentLogs.slice(prevLenRef.current);
    newLines.forEach((line) => {
      term.writeln('\x1b[90m' + line + '\x1b[0m');
    });
    prevLenRef.current = agentLogs.length;
  }, [agentLogs.length]);

  // Reset when agentLogs are cleared (new run)
  useEffect(() => {
    if (agentLogs.length === 0 && termRef.current) {
      termRef.current.clear();
      prevLenRef.current = 0;
    }
  }, [agentLogs.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#09090b]">
      {/* Toolbar */}
      <div className="flex items-center px-3 py-1.5 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <span className="text-xs text-zinc-500 font-medium">Training Logs</span>
        <button
          onClick={() => {
            termRef.current?.clear();
            clearAgentLogs();
            prevLenRef.current = 0;
          }}
          className="ml-auto text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
