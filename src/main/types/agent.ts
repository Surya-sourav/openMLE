import type { MLPlan, EdaSummary, AlgorithmChoice, PreprocessingStep } from './plan.js';
import type { Task } from './task.js';

export interface ResearchResult {
  algorithmChoice: AlgorithmChoice;
  preprocessingSteps: PreprocessingStep[];
  taskType: string;
  rationale: string;
  kbSources: string[];
}

export interface KBResult {
  content: string;
  source: string;
  score: number;
}

export interface KernelOutput {
  type: 'stdout' | 'stderr' | 'result' | 'error' | 'status';
  text: string;
  executionCount?: number;
}

export type LogAction =
  | { type: 'adjust_lr'; suggestedLR: number }
  | { type: 'add_early_stopping'; patience: number }
  | { type: 'stop_nan' }
  | { type: 'continue' }
  | { type: 'flag_slow_convergence' };

export interface LogContext {
  recentLossHistory: { epoch: number; trainLoss: number; valLoss?: number }[];
  bestValLoss?: number;
}

export interface RunContext {
  runId: number;
  projectId: number;
  stage: string;
  status: string;
  plan?: MLPlan;
  edaSummary?: EdaSummary;
  researchResult?: ResearchResult;
  currentTask?: Task;
  abortController: AbortController;
}
