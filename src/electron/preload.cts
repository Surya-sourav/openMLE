import type { IpcRenderer, ContextBridge } from 'electron';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron") as { contextBridge: ContextBridge; ipcRenderer: IpcRenderer };
import type { DatabaseAPI } from "./preloads/database.preload.js";
import type { LLMAPI } from "./preloads/llm.preload.js";
import type { AgentAPI } from "./preloads/sql-agent.preload.js";
import type { MLAgentAPI } from "./preloads/ml-agent.preload.js";
import type { llmconnreq } from "./internal-database/repositories/llmconn.repository.js";
import type { Connection } from "./internal-database/schemas/connections.schema.js";
import type { SQLAgentQueryRequest } from "./interfaces/requests/sql-agent-query.request.js";

const databaseAPI: DatabaseAPI = {
  getAll: () => ipcRenderer.invoke("database/get_all_connections"),
  getDefault: () => ipcRenderer.invoke("database/get_default_connection"),
  saveConnection: (connection: Connection, setAsDefault: boolean ) =>
    ipcRenderer.invoke("database/save_connection", connection , setAsDefault),
  setDefaultConnection: (id: number) =>
    ipcRenderer.invoke("database/set_default_connection", id),
  connect: (id: number) => ipcRenderer.invoke("database/connect", id),
  disconnect: (id: number) => ipcRenderer.invoke("database/disconnect", id),
  deleteConnection: (id: number) =>
    ipcRenderer.invoke("database/delete_connection", id),
  isActiveConnection: (id: number) =>
    ipcRenderer.invoke("database/isactive_connection", id),
  getActiveConnection: (id: number) =>
    ipcRenderer.invoke("database/getactive_connection", id),
  testConnection: (connection : Connection) => 
    ipcRenderer.invoke("database/test_connection",connection),
};

const llmAPI: LLMAPI = {
  getConnections: () => ipcRenderer.invoke("llm/getconnections"),
  getConnection: (id: number) =>
    ipcRenderer.invoke("llm/getconnection", id),
  getDefault: () => ipcRenderer.invoke("llm/getdefault"),
  saveConnection: (connection: llmconnreq) =>
    ipcRenderer.invoke("llm/saveconnection", connection),
  setDefault: (id: number) =>
    ipcRenderer.invoke("llm/setdefaultllm", id),
  updateConnection: (id: number, updates: any) =>
    ipcRenderer.invoke("llm/updateconnection", id, updates),
  connect: (id: number) => ipcRenderer.invoke("llm/connect", id),
  disconnect: (id: number) =>
    ipcRenderer.invoke("llm/disconnect",id),
};

const agentAPI: AgentAPI = {
  // Session Management
  newSession: (sessionName: string) =>
    ipcRenderer.invoke("agent/session/new", sessionName),
  getSession: (sessionId: number) =>
    ipcRenderer.invoke("agent/session/get", sessionId),
  getAllSessions: () => ipcRenderer.invoke("agent/session/getall"),
  deleteSession: (sessionId: number) =>
    ipcRenderer.invoke("agent/session/delete", sessionId),

  // Message Management
  newMessage: (payload : SQLAgentQueryRequest) =>
    ipcRenderer.invoke("agent/message/new", payload),
  getAllMessages: (sessionId: number) =>
    ipcRenderer.invoke("agent/message/getall", sessionId),
};

/*
 * Database Connection APIs exposed in main preload script
 */
contextBridge.exposeInMainWorld("database", databaseAPI);

/*
 * LLM Connection APIs exposed in main preload script
 */
contextBridge.exposeInMainWorld("llm", llmAPI);

/*
 * SQL Agent APIs exposed in main preload script
 */
contextBridge.exposeInMainWorld("agent", agentAPI);

// ── ML Agent API (OpenMLE) ──────────────────────────────────────────────────
// Channel strings are inlined here to avoid CJS/ESM mismatch at runtime.
// Keep in sync with src/main/ipc/channels.ts
const mlAgentAPI: MLAgentAPI = {
  uploadDataset: (name, buffer, mimeType) =>
    ipcRenderer.invoke('ml/dataset/upload', { name, buffer, mimeType }),
  listDatasets: () => ipcRenderer.invoke('ml/dataset/list'),
  deleteDataset: (id) => ipcRenderer.invoke('ml/dataset/delete', id),
  previewDataset: (id, rows) => ipcRenderer.invoke('ml/dataset/preview', { id, rows }),

  createProject: (name, datasetId, goal) =>
    ipcRenderer.invoke('ml/project/create', { name, datasetId, goal }),
  listProjects: () => ipcRenderer.invoke('ml/project/list'),

  startAgent: (projectId, userQuery, computeTarget) =>
    ipcRenderer.invoke('ml/agent/start', { projectId, userQuery, computeTarget }),
  approvePlan: (runId) =>
    ipcRenderer.invoke('ml/agent/plan/approve', { runId }),
  rejectPlan: (runId, feedback) =>
    ipcRenderer.invoke('ml/agent/plan/reject', { runId, feedback }),
  handleHumanResponse: (runId, taskId, response) =>
    ipcRenderer.invoke('ml/agent/human/response', { runId, taskId, response }),

  getRun: (runId) => ipcRenderer.invoke('ml/run/get', runId),
  listRuns: (projectId) => ipcRenderer.invoke('ml/run/list', projectId),
  cancelRun: (runId) => ipcRenderer.invoke('ml/run/cancel', runId),

  detectLocalGPU: () => ipcRenderer.invoke('ml/compute/local/detect'),

  startKernel: () => ipcRenderer.invoke('ml/kernel/start'),
  stopKernel: () => ipcRenderer.invoke('ml/kernel/stop'),
  executeKernelCell: (code) => ipcRenderer.invoke('ml/kernel/execute', { code }),
  getKernelStatus: () => ipcRenderer.invoke('ml/kernel/status'),

  getMetrics: (runId) => ipcRenderer.invoke('ml/metrics/get', runId),
  getReport: (runId) => ipcRenderer.invoke('ml/report/get', runId),

  onLogLine: (cb) => { ipcRenderer.on('ml/agent/log/line', (_e, data) => cb(data)); },
  onStatusUpdate: (cb) => { ipcRenderer.on('ml/agent/status/update', (_e, data) => cb(data)); },
  onPlanReady: (cb) => { ipcRenderer.on('ml/agent/plan/ready', (_e, data) => cb(data)); },
  onStepComplete: (cb) => { ipcRenderer.on('ml/agent/step/complete', (_e, data) => cb(data)); },
  onStepFailed: (cb) => { ipcRenderer.on('ml/agent/step/failed', (_e, data) => cb(data)); },
  onHumanCheckpoint: (cb) => { ipcRenderer.on('ml/agent/human/checkpoint', (_e, data) => cb(data)); },
  onAgentComplete: (cb) => { ipcRenderer.on('ml/agent/complete', (_e, data) => cb(data)); },
  onKernelOutput: (cb) => { ipcRenderer.on('ml/kernel/output', (_e, data) => cb(data)); },
  onKernelStatus: (cb) => { ipcRenderer.on('ml/kernel/status', (_e, data) => cb(data)); },
  removeAllListeners: () => {
    [
      'ml/agent/log/line', 'ml/agent/status/update', 'ml/agent/plan/ready',
      'ml/agent/step/complete', 'ml/agent/step/failed', 'ml/agent/human/checkpoint',
      'ml/agent/complete', 'ml/kernel/output', 'ml/kernel/status',
    ].forEach((ch) => ipcRenderer.removeAllListeners(ch));
  },
};

contextBridge.exposeInMainWorld("mlAgent", mlAgentAPI);
