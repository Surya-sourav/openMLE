import type { MLTaskType } from './dataset.js';

export interface ModelMetrics {
  taskType: MLTaskType;
  accuracy?: number;
  f1Score?: number;
  f1PerClass?: Record<string, number>;
  precision?: number;
  recall?: number;
  rocAuc?: number;
  mse?: number;
  rmse?: number;
  mae?: number;
  r2?: number;
  confusionMatrix?: number[][];
  classLabels?: string[];
  trainingDurationSeconds: number;
  modelSizeMb: number;
  modelPath: string;
}
