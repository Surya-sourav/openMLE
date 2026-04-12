import { useEffect, useRef, type MutableRefObject } from 'react';
import type { Terminal } from '@xterm/xterm';

export function useTerminalBuffer(
  runId: number | null,
  terminalRef: MutableRefObject<Terminal | null>,
) {
  const activeRunId = useRef<number | null>(null);

  useEffect(() => {
    if (!runId) return;
    activeRunId.current = runId;

    const handler = (data: { runId: number; line: string; level: string }) => {
      if (data.runId !== activeRunId.current) return;
      const term = terminalRef.current;
      if (!term) return;
      // Colour-code by level
      const prefix =
        data.level === 'error' ? '\x1b[31m' :
        data.level === 'warn'  ? '\x1b[33m' :
        '\x1b[0m';
      term.writeln(prefix + data.line + '\x1b[0m');
    };

    window.mlAgent.onLogLine(handler);

    return () => {
      activeRunId.current = null;
      // removeAllListeners is owned by useRunEvents; we only clear the ref.
    };
  }, [runId, terminalRef]);
}
