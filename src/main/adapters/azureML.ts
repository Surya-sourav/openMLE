import type { CloudAdapter, UploadResult } from './cloudAdapter.js';
import type { MLPlan, ComputeTarget } from '../types/plan.js';

export class AzureMLAdapter implements CloudAdapter {
  private config: Extract<ComputeTarget, { type: 'azure' }> | null = null;

  async connect(config: ComputeTarget): Promise<void> {
    if (config.type !== 'azure') throw new Error('AzureMLAdapter requires azure target');
    this.config = config;
    const { MLClient } = await import('@azure/ai-ml');
    const { DefaultAzureCredential } = await import('@azure/identity');
    const client = new MLClient(
      new DefaultAzureCredential(),
      config.subscriptionId,
      config.resourceGroup,
      config.computeName
    );
    // Validate by listing compute targets
    for await (const _ of client.compute.list()) { break; }
  }

  async uploadArtifacts(options: { datasetPath: string; scriptPath: string; planId: string }): Promise<UploadResult> {
    if (!this.config) throw new Error('Not connected');
    return {
      datasetUri: options.datasetPath,
      scriptUri: options.scriptPath,
      outputUri: `azureml://datastores/workspaceblobstore/paths/openmle/${options.planId}/output`,
      jobName: `openmle-${options.planId.slice(0, 20)}`,
    };
  }

  async submitJob(options: { uploadResult: UploadResult; plan: MLPlan }): Promise<string> {
    if (!this.config) throw new Error('Not connected');
    const { MLClient, command, InputOutputModes } = await import('@azure/ai-ml');
    const { DefaultAzureCredential } = await import('@azure/identity');
    const client = new MLClient(
      new DefaultAzureCredential(),
      this.config.subscriptionId,
      this.config.resourceGroup,
      this.config.computeName
    );

    const job = await client.jobs.beginCreateOrUpdate(options.uploadResult.jobName, command({
      code: options.uploadResult.scriptUri,
      command: `python train.py`,
      environment: 'azureml:AzureML-pytorch-1.9-ubuntu18.04-py37-cuda11-gpu:1',
      compute: this.config.computeName,
      display_name: options.uploadResult.jobName,
    } as never));

    return options.uploadResult.jobName;
  }

  async getJobStatus(jobId: string): Promise<'pending' | 'running' | 'succeeded' | 'failed'> {
    if (!this.config) return 'failed';
    const { MLClient } = await import('@azure/ai-ml');
    const { DefaultAzureCredential } = await import('@azure/identity');
    const client = new MLClient(new DefaultAzureCredential(), this.config.subscriptionId, this.config.resourceGroup, this.config.computeName);
    const job = await client.jobs.get(jobId);
    const status = (job as unknown as { status: string }).status;
    if (status === 'Completed') return 'succeeded';
    if (status === 'Failed' || status === 'Canceled') return 'failed';
    if (status === 'Running') return 'running';
    return 'pending';
  }

  async streamLogs(_jobId: string, onLine: (line: string) => void): Promise<void> {
    onLine('[Azure] Log streaming not yet implemented; polling status...');
    while (true) {
      const status = await this.getJobStatus(_jobId);
      if (status === 'succeeded' || status === 'failed') break;
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }

  async downloadModel(_jobId: string, destPath: string): Promise<void> {
    console.log(`[Azure] Model download to ${destPath} not yet implemented`);
  }
}
