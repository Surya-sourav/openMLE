import fs from 'fs';
import path from 'path';
import type { CloudAdapter, UploadResult } from './cloudAdapter.js';
import type { MLPlan, ComputeTarget } from '../types/plan.js';
import { SandboxService } from '../services/sandboxService.js';

export class LocalGPUAdapter implements CloudAdapter {
  private sandbox = new SandboxService();
  private runningJobs = new Map<string, { done: boolean; logPath: string }>();

  async connect(_config: ComputeTarget): Promise<void> {
    // No connection needed for local
  }

  async uploadArtifacts(options: { datasetPath: string; scriptPath: string; planId: string }): Promise<UploadResult> {
    return {
      datasetUri: options.datasetPath,
      scriptUri: options.scriptPath,
      outputUri: path.dirname(options.scriptPath),
      jobName: `local_${options.planId}`,
    };
  }

  async submitJob(options: { uploadResult: UploadResult; plan: MLPlan }): Promise<string> {
    const { scriptUri, outputUri, jobName } = options.uploadResult;
    const logPath = path.join(outputUri, 'train.log');
    this.runningJobs.set(jobName, { done: false, logPath });

    // Run async (fire and forget) — caller polls getJobStatus
    this.sandbox.executePython({
      scriptPath: scriptUri,
      onStdoutLine: (line) => fs.appendFileSync(logPath, line + '\n'),
      onStderrLine: (line) => fs.appendFileSync(logPath, line + '\n'),
    }).then(() => {
      const job = this.runningJobs.get(jobName);
      if (job) job.done = true;
    });

    return jobName;
  }

  async getJobStatus(jobId: string): Promise<'pending' | 'running' | 'succeeded' | 'failed'> {
    const job = this.runningJobs.get(jobId);
    if (!job) return 'failed';
    return job.done ? 'succeeded' : 'running';
  }

  async streamLogs(jobId: string, onLine: (line: string) => void): Promise<void> {
    const job = this.runningJobs.get(jobId);
    if (!job) return;

    // Tail the log file
    let offset = 0;
    while (!job.done) {
      if (fs.existsSync(job.logPath)) {
        const content = fs.readFileSync(job.logPath, 'utf-8');
        const newContent = content.slice(offset);
        if (newContent) {
          newContent.split('\n').filter(Boolean).forEach(onLine);
          offset = content.length;
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  async downloadModel(_jobId: string, _destPath: string): Promise<void> {
    // Model is already local — nothing to download
  }
}
