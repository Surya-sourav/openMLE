import { useEffect, useRef } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ModeToggle } from './ModeToggle';
import { useAppStore } from '@/store';
import { useRunEvents } from '@/hooks/use-run-events';
import { useRejectPlan, useStartAgent, useAskDataset } from '@/hooks/api/ml-agent';

export function ChatPanel() {
  const messages = useAppStore((s) => s.messages);
  const activeRunId = useAppStore((s) => s.activeRunId);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const selectedDatasetId = useAppStore((s) => s.selectedDatasetId);
  const isAgentRunning = useAppStore((s) => s.isAgentRunning);
  const planStatus = useAppStore((s) => s.planStatus);
  const mode = useAppStore((s) => s.mode);
  const addMessage = useAppStore((s) => s.addMessage);
  const setActiveRunId = useAppStore((s) => s.setActiveRunId);
  const setIsAgentRunning = useAppStore((s) => s.setIsAgentRunning);
  const finalizeStreamingMessage = useAppStore((s) => s.finalizeStreamingMessage);
  const appendToLastAssistantMessage = useAppStore((s) => s.appendToLastAssistantMessage);

  const bottomRef = useRef<HTMLDivElement>(null);
  const rejectPlan = useRejectPlan();
  const startAgent = useStartAgent();
  const askDataset = useAskDataset();

  const { humanCheckpoint } = useRunEvents(activeRunId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    // Reject plan if awaiting
    if (planStatus === 'awaiting' && activeRunId != null) {
      addMessage({ type: 'user', content: text, isStreaming: false });
      rejectPlan.mutate({ runId: activeRunId, feedback: text });
      return;
    }

    addMessage({ type: 'user', content: text, isStreaming: false });

    if (mode === 'query') {
      if (!selectedDatasetId) {
        addMessage({
          type: 'system',
          content: 'Please select a dataset from the sidebar first.',
          isStreaming: false,
        });
        return;
      }
      // Add a streaming placeholder
      const answerId = addMessage({ type: 'assistant', content: '', isStreaming: true });
      askDataset.mutate(
        { datasetId: selectedDatasetId, question: text },
        {
          onSuccess: (answer) => {
            // Replace placeholder with the actual answer
            appendToLastAssistantMessage(answer);
            finalizeStreamingMessage(answerId);
          },
          onError: (err) => {
            finalizeStreamingMessage(answerId);
            addMessage({
              type: 'system',
              content: `Error: ${err instanceof Error ? err.message : String(err)}`,
              isStreaming: false,
            });
          },
        },
      );
      return;
    }

    if (mode === 'agent') {
      if (activeProjectId == null) {
        addMessage({
          type: 'system',
          content: 'Select a project from the sidebar first.',
          isStreaming: false,
        });
        return;
      }
      startAgent.mutate(
        { projectId: activeProjectId, userQuery: text, computeTarget: { type: 'local', device: 'cpu' } },
        {
          onSuccess: (res) => {
            const runId = (res as { data?: { runId: number } }).data?.runId;
            if (runId) {
              setActiveRunId(runId);
              setIsAgentRunning(true);
              addMessage({
                type: 'system',
                content: `Run #${runId} started — pipeline running…`,
                isStreaming: false,
              });
            }
          },
          onError: (err) => {
            addMessage({
              type: 'system',
              content: `Failed to start run: ${err instanceof Error ? err.message : String(err)}`,
              isStreaming: false,
            });
          },
        },
      );
    }
  };

  const handleHumanResponse = (response: 'retry' | 'skip' | 'abort') => {
    if (!activeRunId || !humanCheckpoint) return;
    const taskId = (humanCheckpoint.task as { id?: string })?.id ?? '';
    window.mlAgent.handleHumanResponse(activeRunId, taskId, response);
  };

  const isQueryPending = askDataset.isPending;
  const isDisabled =
    (mode === 'agent' && isAgentRunning && planStatus !== 'awaiting') ||
    (mode === 'query' && isQueryPending);

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      <ModeToggle />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
            {mode === 'agent' ? (
              <>
                <p className="text-zinc-400 text-sm font-medium">Train a machine learning model</p>
                <p className="text-zinc-600 text-xs leading-relaxed">
                  Select a dataset and project from the sidebar,
                  <br />then describe what you want to predict.
                </p>
              </>
            ) : (
              <>
                <p className="text-zinc-400 text-sm font-medium">Ask your dataset anything</p>
                <p className="text-zinc-600 text-xs leading-relaxed">
                  {selectedDatasetId
                    ? 'Dataset selected. Ask a question below.'
                    : 'Upload and select a dataset from the sidebar,\nthen ask questions in natural language.'}
                </p>
                {selectedDatasetId && (
                  <div className="flex flex-col gap-1.5 w-full mt-1">
                    {[
                      'What is the distribution of the target column?',
                      'Show me columns with missing values.',
                      'How many rows and columns does this dataset have?',
                    ].map((ex) => (
                      <button
                        key={ex}
                        className="text-left text-xs text-zinc-600 hover:text-blue-400 hover:bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
                        onClick={() => handleSend(ex)}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

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
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleHumanResponse('skip')}>Skip</Button>
              <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => handleHumanResponse('abort')}>Abort</Button>
            </div>
          </div>
        </div>
      )}

      <ChatInput
        onSend={handleSend}
        disabled={isDisabled}
        placeholder={
          planStatus === 'awaiting' ? 'Send feedback to reject the plan…' :
          isAgentRunning ? 'Pipeline is running…' :
          isQueryPending ? 'Thinking…' :
          mode === 'agent' ? 'Describe your ML goal…' :
          selectedDatasetId ? 'Ask a question about your data…' :
          'Select a dataset first…'
        }
      />
    </div>
  );
}
