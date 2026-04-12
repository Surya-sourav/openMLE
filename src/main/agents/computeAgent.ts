import fs from 'fs';
import path from 'path';
import { complete } from '../llm/client.js';
import { buildPreprocessingScriptPrompt, buildTrainingScriptPrompt } from '../llm/prompts/computePrompts.js';
import { buildSelfCorrectionPrompt } from '../llm/prompts/selfCorrectionPrompt.js';
import { loadPlan } from '../memory/planStore.js';
import { config } from '../config.js';
import { parseLine } from './subagents/logMonitor.js';
import type { Task } from '../types/task.js';
import type { LogContext } from '../types/agent.js';
import type { SandboxService } from '../services/sandboxService.js';
import type { KernelService } from '../services/kernelService.js';
import type { LogStreamService } from '../services/logStreamService.js';
import type { MLRunRepository } from '../repositories/ml-run.repository.js';

export class ComputeAgent {
  constructor(
    private sandbox: SandboxService,
    private kernel: KernelService,
    private logStream: LogStreamService,
    private runRepo: MLRunRepository,
  ) {}

  async runPreprocessing(task: Task): Promise<void> {
    const planId = task.planId;
    const runId = task.payload.runId as number;
    const plan = loadPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    this.logStream.streamLine(runId, '[Preprocessing] Generating script...', 'info');
    const datasetMeta = task.payload.datasetMeta as { storedPath: string };
    const outputDir = path.join(config.workspacePath, planId);
    fs.mkdirSync(outputDir, { recursive: true });
    const processedPath = path.join(outputDir, 'processed.csv');

    const prompt = buildPreprocessingScriptPrompt(plan, datasetMeta.storedPath);
    let scriptCode = this.sandbox.extractCodeBlock(
      await complete({
        system: 'You are an expert Python data scientist.',
        messages: [{ role: 'user', content: prompt }],
      })
    );

    for (let attempt = 1; attempt <= config.maxSelfCorrections; attempt++) {
      const scriptPath = await this.sandbox.writeTempScript(scriptCode, `preprocess_${planId}.py`);
      const result = await this.sandbox.executePython({
        scriptPath,
        args: [datasetMeta.storedPath, processedPath],
        onStdoutLine: (line) => this.logStream.streamLine(runId, line, 'info'),
        onStderrLine: (line) => this.logStream.streamLine(runId, line, 'warn'),
      });

      if (result.exitCode === 0) {
        this.runRepo.saveCodePath(runId, scriptPath);
        this.logStream.streamLine(runId, '[Preprocessing] Complete.', 'info');
        return;
      }

      if (attempt < config.maxSelfCorrections) {
        const fixPrompt = buildSelfCorrectionPrompt({
          originalCode: scriptCode,
          errorMessage: result.stderr.slice(0, 500),
          traceback: result.stderr,
          attemptNumber: attempt,
        });
        scriptCode = this.sandbox.extractCodeBlock(
          await complete({ system: 'You are an expert Python data scientist.', messages: [{ role: 'user', content: fixPrompt }] })
        );
      } else {
        throw new Error(`Preprocessing failed after ${config.maxSelfCorrections} attempts: ${result.stderr.slice(0, 300)}`);
      }
    }
  }

  async generateTrainingCode(task: Task): Promise<string> {
    const planId = task.planId;
    const runId = task.payload.runId as number;
    const plan = loadPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const outputDir = path.join(config.workspacePath, planId);
    const processedPath = path.join(outputDir, 'processed.csv');

    this.logStream.streamLine(runId, '[CodeGen] Generating training script...', 'info');

    const prompt = buildTrainingScriptPrompt(plan, processedPath, outputDir);
    const scriptCode = this.sandbox.extractCodeBlock(
      await complete({
        system: 'You are an expert Python ML engineer. Generate clean, production-quality training code.',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4096,
      })
    );

    const scriptPath = path.join(outputDir, 'train.py');
    fs.writeFileSync(scriptPath, scriptCode, 'utf-8');
    this.runRepo.saveCodePath(runId, scriptPath);

    // Send code to Jupyter kernel (best effort)
    if (this.kernel.isRunning()) {
      try {
        await this.kernel.executeAndStream(scriptCode, (out) =>
          this.logStream.pushKernelOutput(out)
        );
      } catch (e) {
        this.logStream.streamLine(runId, `[CodeGen] Kernel preview failed (non-fatal): ${e}`, 'warn');
      }
    }

    this.logStream.streamLine(runId, `[CodeGen] Script written to ${scriptPath}`, 'info');
    return scriptPath;
  }

  async runTraining(task: Task): Promise<void> {
    const planId = task.planId;
    const runId = task.payload.runId as number;
    const plan = loadPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const scriptPath = task.payload.scriptPath as string;
    this.logStream.streamLine(runId, '[Training] Starting...', 'info');

    const logContext: LogContext = { recentLossHistory: [] };

    let finalMetrics: Record<string, unknown> | null = null;

    const result = await this.sandbox.executePython({
      scriptPath,
      timeoutMs: 30 * 60_000, // 30 min max for training
      onStdoutLine: (line) => {
        this.logStream.streamLine(runId, line, 'info');
        this.runRepo.appendLog(runId, 'info', line);

        // Check for final metrics line
        try {
          const parsed = JSON.parse(line);
          if (parsed.level === 'done' && parsed.metrics) {
            finalMetrics = parsed.metrics as Record<string, unknown>;
          }
        } catch { /* not JSON */ }

        // Log monitor
        const action = parseLine(line, logContext);
        if (action.type !== 'continue') {
          this.logStream.streamLine(runId, `[Monitor] Action: ${action.type}`, 'warn');
          this.runRepo.appendLog(runId, 'warn', `[Monitor] ${JSON.stringify(action)}`);
        }
      },
      onStderrLine: (line) => {
        this.logStream.streamLine(runId, line, 'error');
        this.runRepo.appendLog(runId, 'error', line);
      },
    });

    if (result.exitCode !== 0 && !result.timedOut) {
      throw new Error(`Training failed with exit code ${result.exitCode}: ${result.stderr.slice(0, 300)}`);
    }

    if (finalMetrics) {
      const outputDir = path.join(config.workspacePath, planId);
      const metricsPath = path.join(outputDir, 'metrics.json');
      fs.writeFileSync(metricsPath, JSON.stringify(finalMetrics, null, 2));
    }

    this.logStream.streamLine(runId, '[Training] Complete.', 'info');
  }
}
