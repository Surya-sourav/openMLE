import { useAppStore } from '@/store';
import { KernelPanel } from '@/components/ml-agent/KernelPanel';

export function NotebookPanel() {
  const activeRunId = useAppStore((s) => s.activeRunId);

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      <div className="flex items-center px-3 py-1.5 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <span className="text-xs text-zinc-500 font-medium">Notebook</span>
        <span
          className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono ${
            activeRunId
              ? 'bg-blue-900/40 text-blue-400'
              : 'bg-zinc-800 text-zinc-600'
          }`}
        >
          {activeRunId ? `run #${activeRunId}` : 'idle'}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <KernelPanel runId={activeRunId} />
      </div>
    </div>
  );
}
