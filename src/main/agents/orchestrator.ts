import { randomUUID } from 'crypto';
import { AnalysisAgent } from './analysisAgent.js';
import { ResearchAgent } from './researchAgent.js';
import { ComputeAgent } from './computeAgent.js';
import { TestingAgent } from './testingAgent.js';
import { TaskQueueService } from '../services/taskQueueService.js';
import { DatasetService } from '../services/datasetService.js';
import { SandboxService } from '../services/sandboxService.js';
import { KernelService } from '../services/kernelService.js';
import { VectorKBService } from '../services/vectorKBService.js';
import { LogStreamService } from '../services/logStreamService.js';
import { MLRunRepository } from '../repositories/ml-run.repository.js';
import { MLProjectRepository } from '../repositories/ml-project.repository.js';
import type { Task } from '../types/task.js';
import type { MLPlan } from '../types/plan.js';
import type { ComputeTarget } from '../types/plan.js';
import type { EdaSummary } from '../types/plan.js';
import type { ResearchResult } from '../types/agent.js';
import type { ModelMetrics } from '../types/metrics.js';

interface ApprovalResolver {
  resolve: (approved: boolean) => void;
  reject: (err: Error) => void;
}

export interface OrchestratorDeps {
  datasetService: DatasetService;
  sandboxService: SandboxService;
  kernelService: KernelService;
  vectorKBService: VectorKBService;
  logStreamService: LogStreamService;
}

export class MLOrchestrator {
  private runRepo = new MLRunRepository();
  private projectRepo = new MLProjectRepository();
  private approvalResolvers = new Map<number, ApprovalResolver>();
  private activeQueues = new Map<number, TaskQueueService>();

  private logStream: LogStreamService;
  private analysisAgent: AnalysisAgent;
  private researchAgent: ResearchAgent;
  private computeAgent: ComputeAgent;
  private testingAgent: TestingAgent;

  constructor(private deps: OrchestratorDeps) {
    this.logStream = deps.logStreamService;

    const sandbox = deps.sandboxService;
    const kernel = deps.kernelService;

    this.analysisAgent = new AnalysisAgent(deps.datasetService, sandbox, this.logStream);
    this.researchAgent = new ResearchAgent(deps.vectorKBService, this.logStream);
    this.computeAgent = new ComputeAgent(sandbox, kernel, this.logStream, this.runRepo);
    this.testingAgent = new TestingAgent(sandbox, this.logStream, this.runRepo);
  }

  async startPipeline(input: {
    projectId: number;
    datasetId: string;
    userQuery: string;
    computeTarget: ComputeTarget;
  }): Promise<number> {
    const planId = randomUUID();

    // Create run record
    const run = this.runRepo.create({
      project_id: input.projectId,
      stage: 'eda',
      status: 'running',
      started_at: new Date(),
    });
    const runId = run.id!;

    // Set up task queue
    const queue = new TaskQueueService();
    queue.setPlanId(planId);
    this.activeQueues.set(runId, queue);

    // Forward task status updates to renderer
    queue.on('status_update', (task: Task) => {
      this.logStream.pushStageChange(runId, task.type);
    });
    queue.on('human_checkpoint', (task: Task) => {
      this.logStream.pushHumanCheckpoint(runId, task, task.error ?? 'Unknown error');
    });

    const commonPayload = { runId, datasetId: input.datasetId, userQuery: input.userQuery, computeTarget: input.computeTarget, planId };

    // Enqueue all tasks
    queue.enqueue({ type: 'eda_analysis', planId, maxRetries: 2, payload: commonPayload });
    queue.enqueue({ type: 'research', planId, maxRetries: 2, payload: commonPayload });
    queue.enqueue({ type: 'plan_generation', planId, maxRetries: 1, payload: commonPayload });
    queue.enqueue({ type: 'preprocessing', planId, maxRetries: 2, payload: commonPayload });
    queue.enqueue({ type: 'code_generation', planId, maxRetries: 2, payload: commonPayload });
    queue.enqueue({ type: 'training', planId, maxRetries: 1, payload: commonPayload });
    queue.enqueue({ type: 'evaluation', planId, maxRetries: 2, payload: commonPayload });
    queue.enqueue({ type: 'report_generation', planId, maxRetries: 1, payload: commonPayload });

    // Wire executor
    let edaSummary: EdaSummary | null = null;
    let researchResult: ResearchResult | null = null;
    let scriptPath = '';
    let metrics: ModelMetrics | null = null;

    queue.setExecutor(async (task: Task) => {
      this.runRepo.updateStage(runId, task.type);
      this.runRepo.updateStatus(runId, 'running');

      switch (task.type) {
        case 'eda_analysis': {
          edaSummary = await this.analysisAgent.runEDA(task);
          this.runRepo.saveEdaResult(runId, JSON.stringify(edaSummary));
          this.logStream.pushStepComplete(runId, 'eda_analysis', edaSummary);
          break;
        }
        case 'research': {
          const eda = edaSummary as EdaSummary | null;
          const inferredTaskType: string = eda?.classBalance
            ? (Object.keys(eda.classBalance).length === 2 ? 'binary_classification' : 'multiclass_classification')
            : (eda?.targetColumn ? 'regression' : 'unknown');
          task.payload = { ...task.payload, edaSummary, taskType: inferredTaskType };
          researchResult = await this.researchAgent.run(task);
          this.logStream.pushStepComplete(runId, 'research', researchResult);
          break;
        }
        case 'plan_generation': {
          task.payload = { ...task.payload, edaSummary, researchResult };
          await this.analysisAgent.generatePlan(task, async (plan: MLPlan) => {
            this.runRepo.savePlan(runId, JSON.stringify(plan));
            this.logStream.pushPlanReady(runId, plan);
            // Suspend queue until user responds
            queue.pause();
            return new Promise<boolean>((resolve, reject) => {
              this.approvalResolvers.set(runId, { resolve, reject });
            });
          });
          break;
        }
        case 'preprocessing': {
          const dataset = this.deps.datasetService.getDataset(input.datasetId);
          task.payload = { ...task.payload, datasetMeta: dataset };
          await this.computeAgent.runPreprocessing(task);
          this.logStream.pushStepComplete(runId, 'preprocessing');
          break;
        }
        case 'code_generation': {
          scriptPath = await this.computeAgent.generateTrainingCode(task);
          this.logStream.pushStepComplete(runId, 'code_generation', { scriptPath });
          break;
        }
        case 'training': {
          task.payload = { ...task.payload, scriptPath };
          await this.computeAgent.runTraining(task);
          this.logStream.pushStepComplete(runId, 'training');
          break;
        }
        case 'evaluation': {
          metrics = await this.testingAgent.run(task);
          this.logStream.pushStepComplete(runId, 'evaluation', metrics);
          break;
        }
        case 'report_generation': {
          task.payload = { ...task.payload, metrics };
          const reportPath = await this.testingAgent.generateReport(task);
          this.runRepo.complete(runId);
          this.runRepo.updateStatus(runId, 'completed');
          this.projectRepo.updateStatus(input.projectId, 'completed');
          this.logStream.pushAgentComplete(runId, metrics, reportPath);
          break;
        }
      }
    });

    // Start processing (non-blocking)
    queue.start();

    return runId;
  }

  approvePlan(runId: number): void {
    const resolver = this.approvalResolvers.get(runId);
    if (!resolver) return;
    this.approvalResolvers.delete(runId);
    this.runRepo.approvePlan(runId);
    resolver.resolve(true);
    // Resume queue after a tick so the plan generation task can complete first
    const queue = this.activeQueues.get(runId);
    if (queue) setTimeout(() => queue.resume(), 100);
  }

  rejectPlan(runId: number, feedback?: string): void {
    const resolver = this.approvalResolvers.get(runId);
    if (!resolver) return;
    this.approvalResolvers.delete(runId);
    // Update plan with rejection feedback and resolve(false) so generatePlan loops
    const queue = this.activeQueues.get(runId);
    resolver.resolve(false);
    if (queue) setTimeout(() => queue.resume(), 100);
  }

  handleHumanCheckpoint(runId: number, taskId: string, response: 'retry' | 'skip' | 'abort'): void {
    const queue = this.activeQueues.get(runId);
    if (!queue) return;
    queue.handleHumanResponse(taskId, response);
  }

  cancelRun(runId: number): void {
    const queue = this.activeQueues.get(runId);
    if (queue) {
      queue.handleHumanResponse('', 'abort');
      this.activeQueues.delete(runId);
    }
    this.runRepo.setError(runId, 'Cancelled by user');
    this.runRepo.updateStatus(runId, 'cancelled');
  }

  getRunStatus(runId: number) {
    return this.runRepo.getById(runId);
  }

  /** Called on app quit — cancel all pending approvals gracefully */
  shutdownAll(): void {
    for (const [runId, resolver] of this.approvalResolvers) {
      resolver.reject(new Error('App closing'));
      this.runRepo.updateStatus(runId, 'cancelled');
    }
    this.approvalResolvers.clear();
  }
}
