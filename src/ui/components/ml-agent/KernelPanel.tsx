import { useEffect, useRef, useState } from 'react';
import { Terminal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KernelOutput {
  type: 'stream' | 'execute_result' | 'error' | 'display_data';
  text?: string;
  data?: Record<string, string>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

interface CellOutput {
  id: string;
  code: string;
  outputs: KernelOutput[];
  status: 'running' | 'done' | 'error';
}

interface Props {
  runId: number | null;
}

export function KernelPanel({ runId }: Props) {
  const [cells, setCells] = useState<CellOutput[]>([]);
  const [kernelStatus, setKernelStatus] = useState<'idle' | 'starting' | 'busy' | 'dead'>('idle');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!runId) return;

    window.mlAgent.onKernelOutput((data) => {
      const output = (data as { output: KernelOutput }).output;
      setCells((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.status === 'running') {
          return [
            ...prev.slice(0, -1),
            { ...last, outputs: [...last.outputs, output] },
          ];
        }
        return [
          ...prev,
          { id: crypto.randomUUID(), code: '', outputs: [output], status: 'running' },
        ];
      });
    });

    window.mlAgent.onKernelStatus((data) => {
      setKernelStatus((data as { status: string }).status as typeof kernelStatus);
    });

    return () => {
      window.mlAgent.removeAllListeners();
    };
  }, [runId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cells.length]);

  const statusColor = {
    idle: 'text-zinc-400',
    starting: 'text-yellow-400',
    busy: 'text-blue-400',
    dead: 'text-red-400',
  }[kernelStatus];

  const statusDot = {
    idle: 'bg-zinc-500',
    starting: 'bg-yellow-400 animate-pulse',
    busy: 'bg-blue-400 animate-pulse',
    dead: 'bg-red-500',
  }[kernelStatus];

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-300">Kernel Output</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${statusDot}`} />
          <span className={`text-xs ${statusColor}`}>{kernelStatus}</span>
        </div>
      </div>

      {/* Cell outputs */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs">
        {cells.length === 0 && (
          <p className="text-zinc-600 italic text-center mt-8">No kernel output yet.</p>
        )}

        {cells.map((cell) => (
          <div key={cell.id} className="space-y-1">
            {cell.code && (
              <div className="flex items-start gap-2">
                <span className="text-zinc-600 select-none shrink-0">In&nbsp;[{cell.id.slice(0, 3)}]:</span>
                <pre className="text-zinc-300 whitespace-pre-wrap break-all">{cell.code}</pre>
              </div>
            )}
            {cell.status === 'running' && cell.outputs.length === 0 && (
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Running…</span>
              </div>
            )}
            {cell.outputs.map((out, i) => {
              if (out.type === 'stream' || out.type === 'execute_result') {
                const text = out.text ?? out.data?.['text/plain'] ?? '';
                return (
                  <pre key={i} className="text-green-300 whitespace-pre-wrap break-all leading-5">
                    {text}
                  </pre>
                );
              }
              if (out.type === 'error') {
                return (
                  <div key={i} className="space-y-0.5">
                    <p className="text-red-400 font-semibold">{out.ename}: {out.evalue}</p>
                    {out.traceback?.map((tb, j) => (
                      <pre key={j} className="text-red-300 whitespace-pre-wrap break-all text-[10px] leading-4 opacity-80">
                        {tb}
                      </pre>
                    ))}
                  </div>
                );
              }
              if (out.type === 'display_data') {
                const html = out.data?.['text/html'];
                const text = out.data?.['text/plain'] ?? '';
                if (html) {
                  return (
                    <div
                      key={i}
                      className="text-zinc-300"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                }
                return <pre key={i} className="text-zinc-300 whitespace-pre-wrap">{text}</pre>;
              }
              return null;
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      {cells.length > 0 && (
        <div className="px-3 py-1.5 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between">
          <span className="text-zinc-600 text-[10px]">{cells.length} cell{cells.length !== 1 ? 's' : ''}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs text-zinc-500 hover:text-zinc-300 px-2"
            onClick={() => setCells([])}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
