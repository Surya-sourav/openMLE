import { spawn, ChildProcess } from 'child_process';
import { createInterface } from 'readline';
import http from 'http';
import { WebSocket as _WS } from 'ws';

// Local interface for the ws package's WebSocket (EventEmitter-based).
// Uses any[] for listener args so specific callbacks (Buffer, string, etc.) remain assignable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyListener = (...args: any[]) => void;
interface NodeWebSocket {
  once(event: string, listener: AnyListener): this;
  on(event: string, listener: AnyListener): this;
  off(event: string, listener: AnyListener): this;
  listeners(event: string): AnyListener[];
  send(data: string | Buffer): void;
  close(): void;
  readyState: number;
}
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { LogStreamService } from './logStreamService.js';
import type { KernelOutput } from '../types/agent.js';

interface JupyterConfig {
  baseUrl: string;
  token: string;
  port: number;
}

interface KernelMsg {
  header: { msg_id: string; msg_type: string };
  parent_header: { msg_id: string };
  content: Record<string, unknown>;
  channel?: string;
}

export class KernelService {
  private serverProcess: ChildProcess | null = null;
  private ws: NodeWebSocket | null = null;
  private serverConfig: JupyterConfig | null = null;
  private kernelId: string | null = null;
  private status: 'idle' | 'busy' | 'dead' = 'idle';
  private pendingReplies: Map<string, { resolve: (output: string) => void; reject: (e: Error) => void; outputs: string[] }> = new Map();

  async start(): Promise<void> {
    if (this.serverProcess) return; // already running

    // Dynamic import to avoid issues at module load time
    const getPort = (await import('get-port')).default;
    const port = config.jupyterPort || await getPort();

    await new Promise<void>((resolve, reject) => {
      this.serverProcess = spawn('python', ['-m', 'jupyter_server', `--port=${port}`, '--no-browser', '--ServerApp.token=openmle'], {
        env: { ...process.env },
      });

      let token = 'openmle';
      const rl = createInterface({ input: this.serverProcess.stdout! });
      rl.on('line', (line) => {
        const match = line.match(/token=([a-zA-Z0-9]+)/);
        if (match) token = match[1];
        if (line.includes('Jupyter Server') && line.includes('running')) {
          this.serverConfig = { baseUrl: `http://localhost:${port}`, token, port };
          resolve();
        }
      });

      this.serverProcess.on('error', reject);
      setTimeout(() => reject(new Error('Jupyter server startup timeout')), 30_000);
    });

    await this.connectKernel();
  }

  private async connectKernel(): Promise<void> {
    if (!this.serverConfig) throw new Error('Server not started');

    const { baseUrl, token } = this.serverConfig;

    // Create kernel via REST
    const kernelData = await this.httpPost(`${baseUrl}/api/kernels`, {}, token);
    this.kernelId = (kernelData as { id: string }).id;

    // Connect WebSocket
    const wsUrl = `ws://localhost:${this.serverConfig.port}/api/kernels/${this.kernelId}/channels?token=${token}`;
    this.ws = new (_WS as unknown as new (url: string) => NodeWebSocket)(wsUrl);

    await new Promise<void>((resolve, reject) => {
      this.ws!.once('open', resolve);
      this.ws!.once('error', reject);
    });

    this.ws.on('message', (raw: Buffer | string) => {
      try {
        const msg: KernelMsg = JSON.parse(raw.toString());
        this.handleKernelMessage(msg);
      } catch { /* ignore malformed */ }
    });
  }

  private handleKernelMessage(msg: KernelMsg): void {
    const logStream = LogStreamService.getInstance();
    const parentId = msg.parent_header?.msg_id;
    const pending = parentId ? this.pendingReplies.get(parentId) : undefined;

    switch (msg.header.msg_type) {
      case 'status': {
        this.status = (msg.content.execution_state as 'idle' | 'busy' | 'dead') ?? 'idle';
        logStream.pushKernelStatus(this.status);
        break;
      }
      case 'stream': {
        const text = msg.content.text as string;
        const output: KernelOutput = { type: (msg.content.name as 'stdout' | 'stderr') ?? 'stdout', text };
        logStream.pushKernelOutput(output);
        if (pending) pending.outputs.push(text);
        break;
      }
      case 'execute_result':
      case 'display_data': {
        const text = ((msg.content.data as Record<string, unknown>)?.['text/plain'] as string) ?? '';
        logStream.pushKernelOutput({ type: 'result', text });
        if (pending) pending.outputs.push(text);
        break;
      }
      case 'error': {
        const tb = (msg.content.traceback as string[]).join('\n');
        logStream.pushKernelOutput({ type: 'error', text: tb });
        if (pending) pending.reject(new Error(tb));
        break;
      }
      case 'execute_reply': {
        if (pending) {
          if (msg.content.status === 'error') {
            pending.reject(new Error(String(msg.content.ename) + ': ' + String(msg.content.evalue)));
          } else {
            pending.resolve(pending.outputs.join(''));
          }
          this.pendingReplies.delete(parentId!);
        }
        break;
      }
    }
  }

  async executeCell(code: string): Promise<string> {
    if (!this.ws || !this.kernelId) throw new Error('Kernel not started');

    return new Promise<string>((resolve, reject) => {
      const msgId = randomUUID();
      this.pendingReplies.set(msgId, { resolve, reject, outputs: [] });

      const msg = {
        header: { msg_id: msgId, msg_type: 'execute_request', username: 'openmle', session: randomUUID(), version: '5.3' },
        parent_header: {},
        metadata: {},
        content: { code, silent: false, store_history: true, user_expressions: {}, allow_stdin: false },
        channel: 'shell',
      };

      this.ws!.send(JSON.stringify(msg));
      setTimeout(() => {
        this.pendingReplies.delete(msgId);
        reject(new Error('Kernel execute timeout'));
      }, config.sandboxTimeoutMs);
    });
  }

  async executeAndStream(code: string, onOutput: (output: KernelOutput) => void): Promise<void> {
    if (!this.ws || !this.kernelId) throw new Error('Kernel not started');

    return new Promise<void>((resolve, reject) => {
      const msgId = randomUUID();
      const originalHandler = this.ws!.listeners('message')[0] as ((data: Buffer) => void) | undefined;

      const streamHandler = (raw: Buffer) => {
        try {
          const msg: KernelMsg = JSON.parse(raw.toString());
          if (msg.parent_header?.msg_id !== msgId) return;

          switch (msg.header.msg_type) {
            case 'stream':
              onOutput({ type: (msg.content.name as 'stdout' | 'stderr') ?? 'stdout', text: msg.content.text as string });
              break;
            case 'execute_result':
              onOutput({ type: 'result', text: ((msg.content.data as Record<string, unknown>)?.['text/plain'] as string) ?? '' });
              break;
            case 'error':
              onOutput({ type: 'error', text: (msg.content.traceback as string[]).join('\n') });
              break;
            case 'execute_reply':
              this.ws!.off('message', streamHandler);
              if (originalHandler) this.ws!.on('message', originalHandler);
              if (msg.content.status === 'error') {
                reject(new Error(String(msg.content.ename)));
              } else {
                resolve();
              }
              break;
          }
        } catch { /* ignore */ }
      };

      this.ws!.off('message', this.ws!.listeners('message')[0] as () => void);
      this.ws!.on('message', streamHandler);

      const msg = {
        header: { msg_id: msgId, msg_type: 'execute_request', username: 'openmle', session: randomUUID(), version: '5.3' },
        parent_header: {},
        metadata: {},
        content: { code, silent: false, store_history: true, user_expressions: {}, allow_stdin: false },
        channel: 'shell',
      };
      this.ws!.send(JSON.stringify(msg));
    });
  }

  async shutdown(): Promise<void> {
    if (this.kernelId && this.serverConfig) {
      try {
        await this.httpDelete(`${this.serverConfig.baseUrl}/api/kernels/${this.kernelId}`, this.serverConfig.token);
      } catch { /* ignore */ }
    }
    this.ws?.close();
    this.serverProcess?.kill('SIGTERM');
    this.serverProcess = null;
    this.ws = null;
    this.kernelId = null;
    this.serverConfig = null;
  }

  getStatus(): string { return this.status; }
  isRunning(): boolean { return this.serverProcess !== null; }

  private httpPost(url: string, body: unknown, token: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const u = new URL(url);
      const req = http.request(
        { hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `token ${token}` } },
        (res) => {
          let raw = '';
          res.on('data', (c: string) => (raw += c));
          res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
        }
      );
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  private httpDelete(url: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = http.request(
        { hostname: u.hostname, port: u.port, path: u.pathname, method: 'DELETE', headers: { Authorization: `token ${token}` } },
        (res) => { res.resume(); res.on('end', resolve); }
      );
      req.on('error', reject);
      req.end();
    });
  }
}
