import { useEffect, useRef } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useAppStore } from '@/store';
import { useRunEvents } from '@/hooks/use-run-events';
import { useRejectPlan } from '@/hooks/api/ml-agent';

export function ChatPanel() {
  const messages = useAppStore((s) => s.messages);
  const activeRunId = useAppStore((s) => s.activeRunId);
  const isAgentRunning = useAppStore((s) => s.isAgentRunning);
  const planStatus = useAppStore((s) => s.planStatus);
  const addMessage = useAppStore((s) => s.addMessage);

  const bottomRef = useRef<HTMLDivElement>(null);
  const rejectPlan = useRejectPlan();

  // Subscribe to run events (also writes to Zustand store)
  const { humanCheckpoint } = useRunEvents(activeRunId);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    // If plan is awaiting, treat text as rejection feedback
    if (planStatus === 'awaiting' && activeRunId != null) {
      addMessage({ type: 'user', content: text, isStreaming: false });
      rejectPlan.mutate({ runId: activeRunId, feedback: text });
      return;
    }

    // Otherwise just add the message — ProjectSidebar handles starting the agent
    addMessage({ type: 'user', content: text, isStreaming: false });
  };

  const handleHumanResponse = (response: 'retry' | 'skip' | 'abort') => {
    if (!activeRunId || !humanCheckpoint) return;
    const taskId = (humanCheckpoint.task as { id?: string })?.id ?? '';
    window.mlAgent.handleHumanResponse(activeRunId, taskId, response);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-zinc-600 text-sm">Select a dataset and project,<br />then start a run from the sidebar.</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Human checkpoint banner */}
      {humanCheckpoint && (
        <div className="shrink-0 mx-4 mb-2 border border-yellow-500/40 bg-yellow-500/10 rounded-md px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 flex-1">
            <p className="text-yellow-300 font-medium">Human Checkpoint</p>
            <p className="text-zinc-300">{humanCheckpoint.error}</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleHumanResponse('retry')}>
                <RefreshCw className="w-3 h-3" /> Retry
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleHumanResponse('skip')}>
                Skip
              </Button>
              <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => handleHumanResponse('abort')}>
                Abort
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <ChatInput
        onSend={handleSend}
        disabled={isAgentRunning && planStatus !== 'awaiting'}
        placeholder={
          planStatus === 'awaiting'
            ? 'Send feedback to reject the plan…'
            : isAgentRunning
              ? 'Pipeline is running…'
              : 'Use the sidebar to start a run'
        }
      />
    </div>
  );
}
