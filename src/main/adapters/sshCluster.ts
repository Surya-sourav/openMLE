import path from 'path';
import type { CloudAdapter, UploadResult } from './cloudAdapter.js';
import type { MLPlan, ComputeTarget } from '../types/plan.js';

// Local type aliases — standalone (no extends) to avoid overload conflicts
interface SSHStreamWithClose {
  on(ev: 'data',  cb: (d: Buffer) => void): void;
  on(ev: 'close', cb: (code: number) => void): void;
  on(ev: string,  cb: (...args: unknown[]) => void): void;
  stderr: { on(ev: string, cb: (d: Buffer) => void): void };
}
interface SFTPChannel {
  fastPut(src: string, dst: string, cb: (err: unknown) => void): void;
  fastGet(src: string, dst: string, cb: (err: unknown) => void): void;
}
interface SSHConn {
  exec(cmd: string, cb: (err: unknown, stream: SSHStreamWithClose) => void): void;
  sftp(cb: (err: unknown, sftp: SFTPChannel) => void): void;
}

export class SSHClusterAdapter implements CloudAdapter {
  private conn: SSHConn | null = null;
  private sshConfig: Extract<ComputeTarget, { type: 'ssh' }> | null = null;

  async connect(config: ComputeTarget): Promise<void> {
    if (config.type !== 'ssh') throw new Error('SSHClusterAdapter requires ssh target');
    this.sshConfig = config;

    const { Client } = await import('ssh2');
    const fs = await import('fs');
    this.conn = await new Promise<SSHConn>((resolve, reject) => {
      const client = new Client();
      client.on('ready', () => resolve(client as unknown as SSHConn));
      client.on('error', reject);
      client.connect({
        host: config.host,
        username: config.user,
        privateKey: fs.readFileSync(config.keyPath as string),
      });
    });
  }

  async uploadArtifacts(options: { datasetPath: string; scriptPath: string; planId: string }): Promise<UploadResult> {
    if (!this.conn || !this.sshConfig) throw new Error('Not connected');
    const { workDir } = this.sshConfig;
    const remoteDataset = `${workDir}/dataset_${options.planId}.csv`;
    const remoteScript = `${workDir}/train_${options.planId}.py`;

    await this.sftp_put(options.datasetPath, remoteDataset);
    await this.sftp_put(options.scriptPath, remoteScript);

    return {
      datasetUri: remoteDataset,
      scriptUri: remoteScript,
      outputUri: workDir,
      jobName: `openmle_${options.planId}`,
    };
  }

  async submitJob(options: { uploadResult: UploadResult; plan: MLPlan }): Promise<string> {
    if (!this.sshConfig) throw new Error('Not connected');
    const { scriptUri, outputUri, jobName } = options.uploadResult;
    const cmd = `tmux new-session -d -s ${jobName} "python ${scriptUri} 2>&1 | tee ${outputUri}/train.log; touch ${outputUri}/done.txt"`;
    await this.exec(cmd);
    return jobName;
  }

  async getJobStatus(jobId: string): Promise<'pending' | 'running' | 'succeeded' | 'failed'> {
    if (!this.sshConfig) return 'failed';
    try {
      await this.exec(`tmux has-session -t ${jobId}`);
      try {
        await this.exec(`test -f ${this.sshConfig.workDir}/done.txt`);
        return 'succeeded';
      } catch {
        return 'running';
      }
    } catch {
      return 'succeeded';
    }
  }

  async streamLogs(_jobId: string, onLine: (line: string) => void): Promise<void> {
    if (!this.sshConfig) return;
    const logPath = `${this.sshConfig.workDir}/train.log`;
    const output = await this.exec(`tail -n 100 ${logPath}`);
    output.split('\n').forEach(onLine);
  }

  async downloadModel(_jobId: string, destPath: string): Promise<void> {
    if (!this.sshConfig) return;
    const remoteModel = `${this.sshConfig.workDir}/model.pkl`;
    await this.sftp_get(remoteModel, path.join(destPath, 'model.pkl'));
  }

  private exec(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.conn) { reject(new Error('Not connected')); return; }
      this.conn.exec(cmd, (err, stream) => {
        if (err) { reject(err); return; }
        let output = '';
        stream.on('data', (d: Buffer) => { output += d.toString(); });
        stream.stderr.on('data', (d: Buffer) => { output += d.toString(); });
        stream.on('close', (code: number) => {
          if (code === 0 || code === null) resolve(output);
          else reject(new Error(`SSH command failed (${code}): ${output}`));
        });
      });
    });
  }

  private sftp_put(localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.conn) { reject(new Error('Not connected')); return; }
      this.conn.sftp((err, sftp) => {
        if (err) { reject(err); return; }
        sftp.fastPut(localPath, remotePath, (e) => (e ? reject(e) : resolve()));
      });
    });
  }

  private sftp_get(remotePath: string, localPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.conn) { reject(new Error('Not connected')); return; }
      this.conn.sftp((err, sftp) => {
        if (err) { reject(err); return; }
        sftp.fastGet(remotePath, localPath, (e) => (e ? reject(e) : resolve()));
      });
    });
  }
}
