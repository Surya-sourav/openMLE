import type { StateCreator } from 'zustand';
import type { AppStore } from '../index';

export type MessageType = 'user' | 'assistant' | 'system' | 'plan-card' | 'metrics-card';

export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  isStreaming?: boolean;
  planData?: unknown;
  metricsData?: Record<string, unknown>;
  runId?: number;
  timestamp: number;
}

export interface ChatSlice {
  messages: ChatMessage[];
  isAgentRunning: boolean;
  rightPanelTab: 'notebook' | 'terminal' | 'metrics';
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  appendToLastAssistantMessage: (chunk: string) => void;
  finalizeStreamingMessage: (id: string) => void;
  setIsAgentRunning: (running: boolean) => void;
  setRightPanelTab: (tab: ChatSlice['rightPanelTab']) => void;
  clearMessages: () => void;
}

export const createChatSlice: StateCreator<AppStore, [], [], ChatSlice> = (set) => ({
  messages: [],
  isAgentRunning: false,
  rightPanelTab: 'notebook',

  addMessage: (msg) => {
    const id = crypto.randomUUID();
    set((s) => ({ messages: [...s.messages, { ...msg, id, timestamp: Date.now() }] }));
    return id;
  },

  appendToLastAssistantMessage: (chunk) => {
    set((s) => {
      const msgs = [...s.messages];
      let lastIdx = -1;
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].type === 'assistant' && msgs[i].isStreaming) {
          lastIdx = i;
          break;
        }
      }
      if (lastIdx === -1) return s;
      msgs[lastIdx] = { ...msgs[lastIdx], content: msgs[lastIdx].content + chunk };
      return { messages: msgs };
    });
  },

  finalizeStreamingMessage: (id) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, isStreaming: false } : m)),
    }));
  },

  setIsAgentRunning: (isAgentRunning) => set({ isAgentRunning }),
  setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
  clearMessages: () => set({ messages: [] }),
});
