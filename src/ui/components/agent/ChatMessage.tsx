import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { PlanApprovalCard } from '@/components/ml-agent/PlanApprovalCard';
import { EvaluationReport } from '@/components/ml-agent/EvaluationReport';
import type { ChatMessage as ChatMessageType } from '@/store';

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  switch (message.type) {
    case 'user':
      return (
        <div className="flex justify-end">
          <div className="max-w-[80%] bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tr-sm px-4 py-2 text-sm text-zinc-200">
            {message.content}
          </div>
        </div>
      );

    case 'assistant': {
      const displayContent = message.isStreaming
        ? message.content
        : message.content;
      return (
        <div className="flex justify-start">
          <div className="max-w-[90%] text-sm text-zinc-200 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }) => (
                  <pre className="bg-zinc-950 border border-zinc-800 rounded-md p-3 overflow-x-auto text-xs">
                    {children}
                  </pre>
                ),
                code: ({ children, className }) =>
                  className ? (
                    <code className={className}>{children}</code>
                  ) : (
                    <code className="bg-zinc-800 px-1 rounded text-zinc-200">{children}</code>
                  ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-zinc-400 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        </div>
      );
    }

    case 'system':
      return (
        <div className="flex justify-center">
          <p className="text-xs text-zinc-500 italic py-1">{message.content}</p>
        </div>
      );

    case 'plan-card':
      if (!message.planData || message.runId == null) return null;
      return (
        <div className="w-full">
          <PlanApprovalCard
            runId={message.runId}
            plan={message.planData as Parameters<typeof PlanApprovalCard>[0]['plan']}
          />
        </div>
      );

    case 'metrics-card':
      if (!message.metricsData || message.runId == null) return null;
      return (
        <div className="w-full">
          <EvaluationReport runId={message.runId} metrics={message.metricsData} />
        </div>
      );

    default:
      return null;
  }
}
