import { useAppStore } from '@/store';

export function ModeToggle() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const clearMessages = useAppStore((s) => s.clearMessages);
  const isAgentRunning = useAppStore((s) => s.isAgentRunning);

  const handleSwitch = (next: 'query' | 'agent') => {
    if (isAgentRunning || next === mode) return;
    clearMessages();
    setMode(next);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 flex-shrink-0 bg-zinc-900">
      <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 gap-0.5">
        <button
          onClick={() => handleSwitch('query')}
          disabled={isAgentRunning}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all
            ${mode === 'query'
              ? 'bg-zinc-950 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'}
            ${isAgentRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          🔍 Ask Data
        </button>
        <button
          onClick={() => handleSwitch('agent')}
          disabled={isAgentRunning}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all
            ${mode === 'agent'
              ? 'bg-zinc-950 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'}
            ${isAgentRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          🤖 Train Model
        </button>
      </div>
    </div>
  );
}
