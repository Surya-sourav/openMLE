import type { BrowserWindow } from 'electron';
import { MLChannels } from '../ipc/channels.js';

export class LogStreamService {
  private static _instance: LogStreamService;
  private window: BrowserWindow | null = null;

  static getInstance(): LogStreamService {
    if (!LogStreamService._instance) {
      LogStreamService._instance = new LogStreamService();
    }
    return LogStreamService._instance;
  }

  setWindow(win: BrowserWindow): void {
    this.window = win;
  }

  streamLine(runId: number, line: string, level: 'info' | 'error' | 'warn' = 'info'): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send(MLChannels.AGENT_LOG_LINE, { runId, line, level });
  }

  pushStageChange(runId: number, stage: string): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send(MLChannels.AGENT_STATUS_UPDATE, { runId, stage });
  }

  pushPlanReady(runId: number, plan: unknown): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send(MLChannels.AGENT_PLAN_READY, { runId, plan });
  }

  pushStepComplete(runId: number, step: string, result?: unknown): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send(MLChannels.AGENT_STEP_COMPLETE, { runId, step, result });
  }

  pushStepFailed(runId: number, step: string, error: string): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send(MLChannels.AGENT_STEP_FAILED, { runId, step, error });
  }

  pushHumanCheckpoint(runId: number, task: unknown, error: string): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send(MLChannels.AGENT_HUMAN_CHECKPOINT, { runId, task, error });
  }

  pushAgentComplete(runId: number, metrics: unknown, reportPath: string): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send(MLChannels.AGENT_COMPLETE, { runId, metrics, reportPath });
  }

  pushKernelOutput(output: unknown): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send(MLChannels.KERNEL_OUTPUT, output);
  }

  pushKernelStatus(status: string): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send(MLChannels.KERNEL_STATUS, { status });
  }
}
