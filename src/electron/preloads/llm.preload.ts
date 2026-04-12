/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LLMConnectionListItem as listllm } from '../llm-gateway/interfaces/requests/listllmconnection.request.js';
import type { llmconn } from '../internal-database/schemas/llmconn.schema.js';
import type { llmconnreq } from '../internal-database/repositories/llmconn.repository.js';
import type { LLMConnectionResponse as llmconnres } from '../internal-database/repositories/llmconn.repository.js';
import type { UpdateLLMConnectionRequest as updatellmconn } from '../llm-gateway/interfaces/requests/updatellmconnection.request.js';

export interface LLMAPI {
  getConnections: () => Promise<listllm[]>;
  getConnection: (id: number) => Promise<llmconn>;
  getDefault: () => Promise<llmconn>;
  saveConnection: (connection: llmconnreq) => Promise<llmconnres>;
  setDefault: (id: number) => Promise<void>;
  updateConnection: (id: number, updates: updatellmconn) => Promise<llmconnres>;
  connect: (id: number) => Promise<any>;
  disconnect: (id: number) => Promise<void>;
}
