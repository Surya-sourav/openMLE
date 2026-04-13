export interface MLDataset {
  id: string;
  originalName: string;
  storedPath: string;
  uploadedAt: string;
  sizeBytes: number;
  rowCount: number;
  columnCount: number;
  columns: { name: string; dtype: string; nullCount: number; uniqueCount: number; sample: (string | number | null)[] }[];
  inferredTask?: string;
}

export interface MLProject {
  id: number;
  name: string;
  dataset_id: number;
  goal: string;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface MLRun {
  id: number;
  project_id: number;
  stage: string;
  status: string;
  eda_result_json?: string | null;
  plan_json?: string | null;
  plan_approved?: boolean | null;
  code_path?: string | null;
  model_path?: string | null;
  eval_json?: string | null;
  report_path?: string | null;
  error_message?: string | null;
  started_at?: Date | null;
  completed_at?: Date | null;
  created_at?: Date | null;
}

export interface ComputeTarget {
  type: 'local' | 'aws' | 'gcp' | 'azure' | 'ssh';
  device?: 'cpu' | 'cuda' | 'mps';
  [key: string]: unknown;
}

export interface MLAgentAPI {
  // Dataset
  uploadDataset(name: string, buffer: ArrayBuffer, mimeType: string): Promise<{ success: boolean; data?: MLDataset; error?: string }>;
  listDatasets(): Promise<{ success: boolean; data?: MLDataset[]; error?: string }>;
  deleteDataset(id: string): Promise<{ success: boolean; error?: string }>;
  previewDataset(id: string, rows?: number): Promise<{ success: boolean; data?: { headers: string[]; rows: (string | number | null)[][] }; error?: string }>;

  // Query mode — ask a natural-language question about an uploaded dataset
  queryDataset(datasetId: string, question: string): Promise<{ success: boolean; data?: { answer: string }; error?: string }>;

  // Projects
  createProject(name: string, datasetId: string, goal: string): Promise<{ success: boolean; data?: MLProject; error?: string }>;
  listProjects(): Promise<{ success: boolean; data?: MLProject[]; error?: string }>;

  // Agent pipeline
  startAgent(projectId: number, userQuery: string, computeTarget: ComputeTarget): Promise<{ success: boolean; data?: { runId: number }; error?: string }>;
  approvePlan(runId: number): Promise<{ success: boolean; error?: string }>;
  rejectPlan(runId: number, feedback?: string): Promise<{ success: boolean; error?: string }>;
  handleHumanResponse(runId: number, taskId: string, response: 'retry' | 'skip' | 'abort'): Promise<{ success: boolean; error?: string }>;

  // Run queries
  getRun(runId: number): Promise<{ success: boolean; data?: MLRun; error?: string }>;
  listRuns(projectId: number): Promise<{ success: boolean; data?: MLRun[]; error?: string }>;
  cancelRun(runId: number): Promise<{ success: boolean; error?: string }>;

  // Compute
  detectLocalGPU(): Promise<{ success: boolean; data?: { cuda: boolean; mps: boolean; deviceName?: string }; error?: string }>;

  // Kernel
  startKernel(): Promise<{ success: boolean; error?: string }>;
  stopKernel(): Promise<{ success: boolean; error?: string }>;
  executeKernelCell(code: string): Promise<{ success: boolean; data?: string; error?: string }>;
  getKernelStatus(): Promise<{ success: boolean; data?: string; error?: string }>;

  // Metrics / Report
  getMetrics(runId: number): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }>;
  getReport(runId: number): Promise<{ success: boolean; data?: { content: string; path: string }; error?: string }>;

  // Push event subscriptions (main → renderer)
  onLogLine(callback: (data: { runId: number; line: string; level: string }) => void): void;
  onStatusUpdate(callback: (data: { runId: number; stage: string }) => void): void;
  onPlanReady(callback: (data: { runId: number; plan: unknown }) => void): void;
  onStepComplete(callback: (data: { runId: number; step: string; result?: unknown }) => void): void;
  onStepFailed(callback: (data: { runId: number; step: string; error: string }) => void): void;
  onHumanCheckpoint(callback: (data: { runId: number; task: unknown; error: string }) => void): void;
  onAgentComplete(callback: (data: { runId: number; metrics: unknown; reportPath: string }) => void): void;
  onKernelOutput(callback: (data: unknown) => void): void;
  onKernelStatus(callback: (data: { status: string }) => void): void;
  removeAllListeners(): void;
}
