export type TaskStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'retrying'
  | 'human_checkpoint'
  | 'cancelled';

export type TaskType =
  | 'eda_analysis'
  | 'research'
  | 'plan_generation'
  | 'preprocessing'
  | 'code_generation'
  | 'training'
  | 'evaluation'
  | 'report_generation';

export interface Task {
  id: string;
  type: TaskType;
  planId: string;
  status: TaskStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  errorStack?: string;
}
