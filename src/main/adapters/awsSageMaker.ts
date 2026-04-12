import fs from 'fs';
import path from 'path';
import type { CloudAdapter, UploadResult } from './cloudAdapter.js';
import type { MLPlan, ComputeTarget } from '../types/plan.js';

export class AWSSageMakerAdapter implements CloudAdapter {
  private config: Extract<ComputeTarget, { type: 'aws' }> | null = null;

  async connect(config: ComputeTarget): Promise<void> {
    if (config.type !== 'aws') throw new Error('AWSSageMakerAdapter requires aws target');
    this.config = config;
    // Validate credentials by listing SageMaker notebooks (lightweight call)
    const { SageMakerClient, ListNotebookInstancesCommand } = await import('@aws-sdk/client-sagemaker');
    const client = new SageMakerClient({ region: config.region });
    await client.send(new ListNotebookInstancesCommand({ MaxResults: 1 }));
  }

  async uploadArtifacts(options: { datasetPath: string; scriptPath: string; planId: string }): Promise<UploadResult> {
    if (!this.config) throw new Error('Not connected');
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: this.config.region });
    const prefix = `openmle/${options.planId}`;

    await s3.send(new PutObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: `${prefix}/dataset.csv`,
      Body: fs.readFileSync(options.datasetPath),
    }));
    await s3.send(new PutObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: `${prefix}/train.py`,
      Body: fs.readFileSync(options.scriptPath),
    }));

    return {
      datasetUri: `s3://${this.config.s3Bucket}/${prefix}/dataset.csv`,
      scriptUri: `s3://${this.config.s3Bucket}/${prefix}/train.py`,
      outputUri: `s3://${this.config.s3Bucket}/${prefix}/output`,
      jobName: `openmle-${options.planId.slice(0, 20)}`,
    };
  }

  async submitJob(options: { uploadResult: UploadResult; plan: MLPlan }): Promise<string> {
    if (!this.config) throw new Error('Not connected');
    const { SageMakerClient, CreateTrainingJobCommand } = await import('@aws-sdk/client-sagemaker');
    const client = new SageMakerClient({ region: this.config.region });

    await client.send(new CreateTrainingJobCommand({
      TrainingJobName: options.uploadResult.jobName,
      RoleArn: this.config.roleArn,
      AlgorithmSpecification: {
        TrainingInputMode: 'File',
        TrainingImage: '763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-training:2.0.0-cpu-py310',
      },
      InputDataConfig: [{
        ChannelName: 'training',
        DataSource: { S3DataSource: { S3Uri: options.uploadResult.datasetUri, S3DataType: 'S3Prefix' } },
      }],
      OutputDataConfig: { S3OutputPath: options.uploadResult.outputUri },
      ResourceConfig: { InstanceType: this.config.instanceType as never, InstanceCount: 1, VolumeSizeInGB: 30 },
      StoppingCondition: { MaxRuntimeInSeconds: 3600 },
    }));

    return options.uploadResult.jobName;
  }

  async getJobStatus(jobId: string): Promise<'pending' | 'running' | 'succeeded' | 'failed'> {
    if (!this.config) return 'failed';
    const { SageMakerClient, DescribeTrainingJobCommand } = await import('@aws-sdk/client-sagemaker');
    const client = new SageMakerClient({ region: this.config.region });
    const resp = await client.send(new DescribeTrainingJobCommand({ TrainingJobName: jobId }));
    const status = resp.TrainingJobStatus;
    if (status === 'Completed') return 'succeeded';
    if (status === 'Failed' || status === 'Stopped') return 'failed';
    if (status === 'InProgress') return 'running';
    return 'pending';
  }

  async streamLogs(jobId: string, onLine: (line: string) => void): Promise<void> {
    if (!this.config) return;
    const { CloudWatchLogsClient, GetLogEventsCommand } = await import('@aws-sdk/client-cloudwatch-logs');
    const client = new CloudWatchLogsClient({ region: this.config.region });
    let nextToken: string | undefined;

    while (true) {
      try {
        const resp = await client.send(new GetLogEventsCommand({
          logGroupName: `/aws/sagemaker/TrainingJobs`,
          logStreamName: `${jobId}/algo-1`,
          nextToken,
        }));
        for (const event of resp.events ?? []) {
          if (event.message) onLine(event.message);
        }
        nextToken = resp.nextForwardToken;
        const status = await this.getJobStatus(jobId);
        if (status === 'succeeded' || status === 'failed') break;
      } catch {
        // Log stream not yet available
      }
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }

  async downloadModel(jobId: string, destPath: string): Promise<void> {
    if (!this.config) return;
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: this.config.region });
    const key = `openmle/${jobId}/output/model.tar.gz`;
    const resp = await s3.send(new GetObjectCommand({ Bucket: this.config.s3Bucket, Key: key }));
    const data = await (resp.Body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
    fs.writeFileSync(path.join(destPath, 'model.tar.gz'), Buffer.from(data));
  }
}
