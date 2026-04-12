import type { MLTaskType } from './dataset.js';

export type { MLTaskType };

export interface EdaSummary {
  rowCount: number;
  columnCount: number;
  targetColumn: string;
  classBalance?: Record<string, number>;
  missingValueColumns: string[];
  highCardinalityColumns: string[];
  correlations: { col1: string; col2: string; r: number }[];
  keyFindings: string[];
}

export interface AlgorithmChoice {
  primary: string;
  library: string;
  alternativeConsidered: string[];
  rationale: string;
  hyperparameters: Record<string, unknown>;
}

export interface PreprocessingStep {
  order: number;
  name: string;
  description: string;
  code?: string;
}

export interface TrainingConfig {
  testSplitRatio: number;
  crossValidationFolds: number;
  earlyStoppingPatience?: number;
  epochs?: number;
  batchSize?: number;
  randomSeed: number;
}

export type ComputeTarget =
  | { type: 'local'; device: 'cpu' | 'cuda' | 'mps' }
  | { type: 'aws'; region: string; instanceType: string; roleArn: string; s3Bucket: string }
  | { type: 'gcp'; project: string; region: string; machineType: string }
  | { type: 'azure'; subscriptionId: string; resourceGroup: string; computeName: string }
  | { type: 'ssh'; host: string; user: string; keyPath: string; workDir: string };

export interface MLPlan {
  id: string;
  datasetId: string;
  createdAt: string;
  status: 'draft' | 'awaiting_approval' | 'approved' | 'rejected' | 'executing' | 'complete';
  userQuery: string;
  objective: string;
  taskType: MLTaskType;
  edaSummary: EdaSummary;
  proposedAlgorithm: AlgorithmChoice;
  preprocessingSteps: PreprocessingStep[];
  trainingConfig: TrainingConfig;
  computeTarget: ComputeTarget;
  rejectionFeedback?: string;
}
