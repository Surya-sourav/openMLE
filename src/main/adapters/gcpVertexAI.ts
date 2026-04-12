import fs from 'fs';
import type { CloudAdapter, UploadResult } from './cloudAdapter.js';
import type { MLPlan, ComputeTarget } from '../types/plan.js';

export class GCPVertexAIAdapter implements CloudAdapter {
  private config: Extract<ComputeTarget, { type: 'gcp' }> | null = null;

  async connect(config: ComputeTarget): Promise<void> {
    if (config.type !== 'gcp') throw new Error('GCPVertexAIAdapter requires gcp target');
    this.config = config;
    // Validate by listing custom jobs
    const aiplatform = await import('@google-cloud/aiplatform');
    const client = new aiplatform.JobServiceClient({ projectId: config.project });
    await client.listCustomJobs({ parent: `projects/${config.project}/locations/${config.region}` });
  }

  async uploadArtifacts(options: { datasetPath: string; scriptPath: string; planId: string }): Promise<UploadResult> {
    if (!this.config) throw new Error('Not connected');
    // GCS upload would go here; stub uses local paths for now
    const gcsBase = `gs://${this.config.project}-openmle/${options.planId}`;
    return {
      datasetUri: `${gcsBase}/dataset.csv`,
      scriptUri: `${gcsBase}/train.py`,
      outputUri: `${gcsBase}/output`,
      jobName: `openmle-${options.planId.slice(0, 20)}`,
    };
  }

  async submitJob(options: { uploadResult: UploadResult; plan: MLPlan }): Promise<string> {
    if (!this.config) throw new Error('Not connected');
    const aiplatform = await import('@google-cloud/aiplatform');
    const client = new aiplatform.JobServiceClient({ projectId: this.config.project });
    const parent = `projects/${this.config.project}/locations/${this.config.region}`;

    const [response] = await client.createCustomJob({
      parent,
      customJob: {
        displayName: options.uploadResult.jobName,
        jobSpec: {
          workerPoolSpecs: [{
            machineSpec: { machineType: this.config.machineType },
            replicaCount: 1,
            pythonPackageSpec: {
              executorImageUri: 'us-docker.pkg.dev/vertex-ai/training/pytorch-gpu.1-13.py310:latest',
              args: [options.uploadResult.scriptUri],
            },
          }],
          baseOutputDirectory: { outputUriPrefix: options.uploadResult.outputUri },
        },
      },
    });

    return (response as unknown as { name: string }).name;
  }

  async getJobStatus(jobId: string): Promise<'pending' | 'running' | 'succeeded' | 'failed'> {
    if (!this.config) return 'failed';
    const aiplatform = await import('@google-cloud/aiplatform');
    const client = new aiplatform.JobServiceClient({ projectId: this.config.project });
    const [job] = await client.getCustomJob({ name: jobId });
    const state = (job as unknown as { state: string }).state;
    if (state === 'JOB_STATE_SUCCEEDED') return 'succeeded';
    if (state === 'JOB_STATE_FAILED' || state === 'JOB_STATE_CANCELLED') return 'failed';
    if (state === 'JOB_STATE_RUNNING') return 'running';
    return 'pending';
  }

  async streamLogs(_jobId: string, onLine: (line: string) => void): Promise<void> {
    // GCP logs would be streamed via Cloud Logging API; stub polls status
    onLine('[GCP] Log streaming via Cloud Logging not yet implemented; polling status...');
    while (true) {
      const status = await this.getJobStatus(_jobId);
      if (status === 'succeeded' || status === 'failed') break;
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }

  async downloadModel(_jobId: string, destPath: string): Promise<void> {
    // GCS download would go here
    console.log(`[GCP] Model download to ${destPath} not yet implemented`);
  }
}
