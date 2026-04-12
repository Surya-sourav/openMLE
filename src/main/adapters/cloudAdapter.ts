import type { MLPlan, ComputeTarget } from '../types/plan.js';

export interface UploadResult {
  datasetUri: string;
  scriptUri: string;
  outputUri: string;
  jobName: string;
}

export interface CloudAdapter {
  connect(config: ComputeTarget): Promise<void>;
  uploadArtifacts(options: {
    datasetPath: string;
    scriptPath: string;
    planId: string;
  }): Promise<UploadResult>;
  submitJob(options: { uploadResult: UploadResult; plan: MLPlan }): Promise<string>;
  getJobStatus(jobId: string): Promise<'pending' | 'running' | 'succeeded' | 'failed'>;
  streamLogs(jobId: string, onLine: (line: string) => void): Promise<void>;
  downloadModel(jobId: string, destPath: string): Promise<void>;
}
