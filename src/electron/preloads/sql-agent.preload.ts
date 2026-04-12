/* eslint-disable @typescript-eslint/no-explicit-any */
import type { session } from '../internal-database/schemas/chat-session.schema.js';
import type { Message } from '../internal-database/schemas/chat-messages.schema.js';
import type { SQLAgentQueryRequest } from '../interfaces/requests/sql-agent-query.request.js';

export interface AgentAPI {
  // Session Management
  newSession: (sessionName: string) => Promise<session>;
  getSession: (sessionId: number) => Promise<session>;
  getAllSessions: () => Promise<session[]>;
  deleteSession: (sessionId: number) => Promise<{ success: boolean }>;

  // Message Management
  newMessage: (payload : SQLAgentQueryRequest) => Promise<Message>;
  getAllMessages: (sessionId: number) => Promise<Message[]>;
}
