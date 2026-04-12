import fs from 'fs';
import path from 'path';
import { complete } from '../llm/client.js';
import { buildEvaluationScriptPrompt, buildReportPrompt } from '../llm/prompts/testingPrompts.js';
import { buildSelfCorrectionPrompt } from '../llm/prompts/selfCorrectionPrompt.js';
import { loadPlan } from '../memory/planStore.js';
import { config } from '../config.js';
import type { Task } from '../types/task.js';
import type { ModelMetrics } from '../types/metrics.js';
import type { SandboxService } from '../services/sandboxService.js';
import type { LogStreamService } from '../services/logStreamService.js';
import type { MLRunRepository } from '../repositories/ml-run.repository.js';

export class TestingAgent {
  constructor(
    private sandbox: SandboxService,
    private logStream: LogStreamService,
    private runRepo: MLRunRepository,
  ) {}

  async run(task: Task): Promise<ModelMetrics> {
    const planId = task.planId;
    const runId = task.payload.runId as number;
    const plan = loadPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const workspaceDir = path.join(config.workspacePath, planId);
    this.logStream.streamLine(runId, '[Evaluation] Generating evaluation script...', 'info');

    const prompt = buildEvaluationScriptPrompt(plan, workspaceDir);
    let scriptCode = this.sandbox.extractCodeBlock(
      await complete({
        system: 'You are an expert Python ML engineer.',
        messages: [{ role: 'user', content: prompt }],
      })
    );

    let evalMetrics: Record<string, unknown> | null = null;

    for (let attempt = 1; attempt <= config.maxSelfCorrections; attempt++) {
      const scriptPath = await this.sandbox.writeTempScript(scriptCode, `eval_${planId}.py`);
      const result = await this.sandbox.executePython({
        scriptPath,
        onStdoutLine: (line) => this.logStream.streamLine(runId, line, 'info'),
        onStderrLine: (line) => this.logStream.streamLine(runId, line, 'warn'),
      });

      if (result.exitCode === 0) {
        const metricsPath = path.join(workspaceDir, 'eval_metrics.json');
        if (fs.existsSync(metricsPath)) {
          evalMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
          break;
        }
      }

      if (attempt < config.maxSelfCorrections) {
        const fixPrompt = buildSelfCorrectionPrompt({
          originalCode: scriptCode,
          errorMessage: result.stderr.slice(0, 500),
          traceback: result.stderr,
          attemptNumber: attempt,
        });
        scriptCode = this.sandbox.extractCodeBlock(
          await complete({ system: 'You are an expert Python ML engineer.', messages: [{ role: 'user', content: fixPrompt }] })
        );
      } else {
        throw new Error(`Evaluation failed after ${config.maxSelfCorrections} attempts`);
      }
    }

    if (!evalMetrics) throw new Error('Evaluation produced no metrics');

    const modelPath = path.join(workspaceDir, 'model.pkl');
    const modelSizeMb = fs.existsSync(modelPath)
      ? fs.statSync(modelPath).size / (1024 * 1024)
      : 0;

    const metrics: ModelMetrics = {
      taskType: plan.taskType,
      accuracy: evalMetrics.accuracy as number | undefined,
      f1Score: evalMetrics.f1_score as number | undefined,
      f1PerClass: evalMetrics.f1_per_class as Record<string, number> | undefined,
      precision: evalMetrics.precision as number | undefined,
      recall: evalMetrics.recall as number | undefined,
      rocAuc: evalMetrics.roc_auc as number | undefined,
      mse: evalMetrics.mse as number | undefined,
      rmse: evalMetrics.rmse as number | undefined,
      mae: evalMetrics.mae as number | undefined,
      r2: evalMetrics.r2 as number | undefined,
      confusionMatrix: evalMetrics.confusion_matrix as number[][] | undefined,
      classLabels: evalMetrics.class_labels as string[] | undefined,
      trainingDurationSeconds: (evalMetrics.training_duration_seconds as number) ?? 0,
      modelSizeMb,
      modelPath,
    };

    this.runRepo.saveEvaluation(runId, JSON.stringify(metrics));
    this.logStream.streamLine(runId, '[Evaluation] Complete.', 'info');
    return metrics;
  }

  async generateReport(task: Task): Promise<string> {
    const planId = task.planId;
    const runId = task.payload.runId as number;
    const plan = loadPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const metrics = task.payload.metrics as Record<string, unknown>;
    this.logStream.streamLine(runId, '[Report] Generating evaluation report...', 'info');

    const reportMd = await complete({
      system: 'You are a senior ML engineer writing clear technical reports.',
      messages: [
        {
          role: 'user',
          content: buildReportPrompt({
            plan,
            metrics,
            keyFindings: plan.edaSummary.keyFindings,
          }),
        },
      ],
      maxTokens: 2048,
    });

    const workspaceDir = path.join(config.workspacePath, planId);
    const reportPath = path.join(workspaceDir, 'report.md');
    fs.writeFileSync(reportPath, reportMd, 'utf-8');
    this.runRepo.saveReport(runId, reportPath);
    this.logStream.streamLine(runId, `[Report] Saved to ${reportPath}`, 'info');
    return reportPath;
  }
}
