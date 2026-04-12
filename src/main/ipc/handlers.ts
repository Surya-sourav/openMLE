import { ipcMain, BrowserWindow } from 'electron';
import { MLChannels } from './channels.js';
import type { MLOrchestrator } from '../agents/orchestrator.js';
import type { DatasetService } from '../services/datasetService.js';
import type { SandboxService } from '../services/sandboxService.js';
import type { KernelService } from '../services/kernelService.js';
import type { MLRunRepository } from '../repositories/ml-run.repository.js';
import type { MLProjectRepository } from '../repositories/ml-project.repository.js';
import { MLRunRepository as RunRepo } from '../repositories/ml-run.repository.js';
import { MLProjectRepository as ProjRepo } from '../repositories/ml-project.repository.js';
import type { ComputeTarget } from '../types/plan.js';
import fs from 'fs';

function ok<T>(data: T) { return { success: true as const, data }; }
function err(message: string) { return { success: false as const, error: message }; }

function wrap<T>(fn: () => Promise<T> | T) {
  return async () => {
    try { return ok(await fn()); }
    catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
  };
}

export class MLAgentHandler {
  private runRepo: MLRunRepository = new RunRepo();
  private projectRepo: MLProjectRepository = new ProjRepo();

  constructor(
    private orchestrator: MLOrchestrator,
    private datasetService: DatasetService,
    private sandboxService: SandboxService,
    private kernelService: KernelService,
  ) {}

  registerHandlers(mainWindow: BrowserWindow): void {
    // ── Dataset ────────────────────────────────────────────────────────────
    ipcMain.handle(MLChannels.DATASET_UPLOAD, async (_e, payload: { name: string; buffer: ArrayBuffer; mimeType: string }) => {
      try {
        const buf = Buffer.from(payload.buffer);
        const meta = await this.datasetService.uploadDataset(payload.name, buf, payload.mimeType);
        return ok(meta);
      } catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.DATASET_LIST, wrap(() => this.datasetService.listDatasets()));

    ipcMain.handle(MLChannels.DATASET_DELETE, async (_e, id: string) => {
      try { await this.datasetService.deleteDataset(id); return ok(null); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.DATASET_PREVIEW, async (_e, payload: { id: string; rows?: number }) => {
      try { return ok(await this.datasetService.previewDataset(payload.id, payload.rows)); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    // ── Projects ──────────────────────────────────────────────────────────
    ipcMain.handle(MLChannels.PROJECT_CREATE, async (_e, payload: { name: string; datasetId: string; goal: string }) => {
      try { return ok(this.projectRepo.create({ name: payload.name, dataset_id: payload.datasetId, goal: payload.goal })); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.PROJECT_LIST, wrap(() => this.projectRepo.getAll()));

    // ── Agent lifecycle ───────────────────────────────────────────────────
    ipcMain.handle(MLChannels.AGENT_START, async (_e, payload: { projectId: number; userQuery: string; computeTarget: ComputeTarget }) => {
      try {
        const project = this.projectRepo.getById(payload.projectId);
        if (!project) return err('Project not found');
        const datasetId = String(project.dataset_id);
        const runId = await this.orchestrator.startPipeline({
          projectId: payload.projectId,
          datasetId,
          userQuery: payload.userQuery,
          computeTarget: payload.computeTarget,
        });
        this.projectRepo.updateStatus(payload.projectId, 'running');
        return ok({ runId });
      } catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.AGENT_PLAN_APPROVE, (_e, payload: { runId: number }) => {
      try { this.orchestrator.approvePlan(payload.runId); return ok(null); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.AGENT_PLAN_REJECT, (_e, payload: { runId: number; feedback?: string }) => {
      try { this.orchestrator.rejectPlan(payload.runId, payload.feedback); return ok(null); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.AGENT_HUMAN_RESPONSE, (_e, payload: { runId: number; taskId: string; response: 'retry' | 'skip' | 'abort' }) => {
      try { this.orchestrator.handleHumanCheckpoint(payload.runId, payload.taskId, payload.response); return ok(null); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    // ── Runs ──────────────────────────────────────────────────────────────
    ipcMain.handle(MLChannels.RUN_GET, (_e, runId: number) => {
      try { return ok(this.runRepo.getById(runId)); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.RUN_LIST, (_e, projectId: number) => {
      try { return ok(this.runRepo.listByProject(projectId)); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.RUN_CANCEL, (_e, runId: number) => {
      try { this.orchestrator.cancelRun(runId); return ok(null); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    // ── Compute ───────────────────────────────────────────────────────────
    ipcMain.handle(MLChannels.COMPUTE_LOCAL_DETECT, async () => {
      try { return ok(await this.sandboxService.detectLocalGPU()); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    // ── Kernel ────────────────────────────────────────────────────────────
    ipcMain.handle(MLChannels.KERNEL_START, async () => {
      try { await this.kernelService.start(); return ok({ status: 'started' }); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.KERNEL_STOP, async () => {
      try { await this.kernelService.shutdown(); return ok(null); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.KERNEL_EXECUTE, async (_e, payload: { code: string }) => {
      try { return ok(await this.kernelService.executeCell(payload.code)); }
      catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.KERNEL_STATUS, () => ok(this.kernelService.getStatus()));

    // ── Metrics / Report ─────────────────────────────────────────────────
    ipcMain.handle(MLChannels.METRICS_GET, (_e, runId: number) => {
      try {
        const run = this.runRepo.getById(runId);
        return ok(run?.eval_json ? JSON.parse(run.eval_json) : null);
      } catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });

    ipcMain.handle(MLChannels.REPORT_GET, (_e, runId: number) => {
      try {
        const run = this.runRepo.getById(runId);
        if (!run?.report_path) return err('No report available');
        const content = fs.readFileSync(run.report_path, 'utf-8');
        return ok({ content, path: run.report_path });
      } catch (e: unknown) { return err(e instanceof Error ? e.message : String(e)); }
    });
  }
}
