import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/hooks/use-run-events';

interface Props {
  logs: LogEntry[];
}

const levelColor: Record<string, string> = {
  info:  'text-zinc-300',
  warn:  'text-yellow-400',
  error: 'text-red-400',
};

export function LogStreamPanel({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-md h-full overflow-y-auto p-3 font-mono text-xs">
      {logs.length === 0 && (
        <p className="text-zinc-600 italic">Waiting for logs...</p>
      )}
      {logs.map((entry, i) => (
        <div key={i} className={`leading-5 whitespace-pre-wrap break-all ${levelColor[entry.level] ?? 'text-zinc-300'}`}>
          {entry.line}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
