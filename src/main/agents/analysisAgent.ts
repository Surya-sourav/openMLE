import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { complete } from '../llm/client.js';
import { buildEdaScriptPrompt, buildEdaSummaryPrompt } from '../llm/prompts/analysisPrompts.js';
import { buildSelfCorrectionPrompt } from '../llm/prompts/selfCorrectionPrompt.js';
import { savePlan } from '../memory/planStore.js';
import { config } from '../config.js';
import type { Task } from '../types/task.js';
import type { EdaSummary, MLPlan } from '../types/plan.js';
import type { DatasetService } from '../services/datasetService.js';
import type { SandboxService } from '../services/sandboxService.js';
import type { LogStreamService } from '../services/logStreamService.js';

export class AnalysisAgent {
  constructor(
    private datasetService: DatasetService,
    private sandboxService: SandboxService,
    private logStream: LogStreamService,
  ) {}

  async runEDA(task: Task): Promise<EdaSummary> {
    const datasetId = task.payload.datasetId as string;
    const runId = task.payload.runId as number;
    const dataset = this.datasetService.getDataset(datasetId);
    if (!dataset) throw new Error(`Dataset ${datasetId} not found`);

    this.logStream.streamLine(runId, `[EDA] Starting analysis on ${dataset.originalName}`, 'info');

    // Generate EDA script via LLM
    const prompt = buildEdaScriptPrompt(dataset);
    const llmOutput = await complete({
      system: 'You are an expert Python data scientist. Output only valid Python code.',
      messages: [{ role: 'user', content: prompt }],
    });
    let scriptCode = this.sandboxService.extractCodeBlock(llmOutput);

    // Self-correction loop
    let lastResult = null;
    for (let attempt = 1; attempt <= config.maxSelfCorrections; attempt++) {
      const scriptPath = await this.sandboxService.writeTempScript(
        scriptCode,
        `eda_${datasetId}.py`
      );
      const result = await this.sandboxService.executePython({
        scriptPath,
        args: [dataset.storedPath],
        onStdoutLine: (line) => this.logStream.streamLine(runId, line, 'info'),
        onStderrLine: (line) => this.logStream.streamLine(runId, line, 'warn'),
      });
      lastResult = result;

      if (result.exitCode === 0) {
        // Parse JSON output
        const jsonLine = result.stdout.trim().split('\n').reverse().find((l) => l.startsWith('{'));
        if (jsonLine) {
          const rawStats = JSON.parse(jsonLine);
          return await this.buildEdaSummary(rawStats, runId);
        }
      }

      if (attempt < config.maxSelfCorrections) {
        this.logStream.streamLine(runId, `[EDA] Script error on attempt ${attempt}, retrying...`, 'warn');
        const fixPrompt = buildSelfCorrectionPrompt({
          originalCode: scriptCode,
          errorMessage: result.stderr.slice(0, 500),
          traceback: result.stderr,
          attemptNumber: attempt,
        });
        const fixOutput = await complete({
          system: 'You are an expert Python data scientist.',
          messages: [{ role: 'user', content: fixPrompt }],
        });
        scriptCode = this.sandboxService.extractCodeBlock(fixOutput);
      }
    }

    // All LLM attempts failed — fall back to the bundled EDA template
    const templatePath = path.join(config.pythonScriptsPath, 'eda_template.py');
    if (fs.existsSync(templatePath)) {
      this.logStream.streamLine(runId, '[EDA] Falling back to bundled EDA template...', 'warn');
      const templateResult = await this.sandboxService.executePython({
        scriptPath: templatePath,
        env: { DATASET_PATH: dataset.storedPath },
        onStdoutLine: (line) => this.logStream.streamLine(runId, line, 'info'),
        onStderrLine: (line) => this.logStream.streamLine(runId, line, 'warn'),
      });
      if (templateResult.exitCode === 0) {
        const jsonLine = templateResult.stdout.trim().split('\n').reverse().find((l) => l.startsWith('{'));
        if (jsonLine) return await this.buildEdaSummary(JSON.parse(jsonLine), runId);
      }
    }

    throw new Error(`EDA script failed after ${config.maxSelfCorrections} attempts: ${lastResult?.stderr.slice(0, 300)}`);
  }

  private async buildEdaSummary(rawStats: Record<string, unknown>, runId: number): Promise<EdaSummary> {
    // Extract structured data from raw stats
    const columns = (rawStats.columns as Record<string, unknown>[]) ?? [];
    const missingValueColumns = columns
      .filter((c) => typeof c.nullCount === 'number' && c.nullCount > 0)
      .map((c) => c.name as string);
    const highCardinalityColumns = columns
      .filter((c) => typeof c.uniqueCount === 'number' && c.uniqueCount > 50)
      .map((c) => c.name as string);

    // Handle two correlation formats:
    //   LLM-generated script: [{col1, col2, r}] (array already correct)
    //   Bundled template:      {"col1|col2": r}  (flat object with pipe-separated key)
    const rawCorr = rawStats.correlations ?? {};
    const correlations: { col1: string; col2: string; r: number }[] = Array.isArray(rawCorr)
      ? (rawCorr as { col1: string; col2: string; r: number }[])
      : Object.entries(rawCorr as Record<string, number>).map(([key, r]) => {
          const [col1, col2] = key.split('|');
          return { col1, col2, r };
        });

    // Use LLM to generate human-readable key findings
    this.logStream.streamLine(runId, '[EDA] Generating key findings...', 'info');
    const findingsJson = await complete({
      system: 'You are a data scientist that writes clear, concise insights.',
      messages: [{ role: 'user', content: buildEdaSummaryPrompt(JSON.stringify(rawStats)) }],
      maxTokens: 512,
    });
    let keyFindings: string[] = [];
    try {
      keyFindings = JSON.parse(findingsJson.replace(/```json\n?|```/g, '').trim());
    } catch {
      keyFindings = ['Dataset loaded and analysed successfully.'];
    }

    // classDistribution: LLM script puts it top-level; template nests it under targetInfo
    const targetInfo = (rawStats.targetInfo ?? {}) as Record<string, unknown>;
    const classDistribution = (
      rawStats.classDistribution ?? targetInfo.classDistribution
    ) as Record<string, number> | undefined;
    const targetColumn =
      (targetInfo.column as string | undefined) ||
      this.guessTargetColumn(columns);

    return {
      rowCount: rawStats.rowCount as number,
      columnCount: rawStats.columnCount as number,
      targetColumn,
      classBalance: classDistribution,
      missingValueColumns,
      highCardinalityColumns,
      correlations,
      keyFindings,
    };
  }

  private guessTargetColumn(columns: Record<string, unknown>[]): string {
    const candidates = ['target', 'label', 'class', 'y', 'output', 'result', 'outcome'];
    for (const cand of candidates) {
      const found = columns.find((c) => String(c.name).toLowerCase() === cand);
      if (found) return found.name as string;
    }
    return columns[columns.length - 1]?.name as string ?? 'target';
  }

  async generatePlan(
    task: Task,
    onPlanReady: (plan: MLPlan) => Promise<boolean>,
  ): Promise<MLPlan> {
    const { datasetId, userQuery, edaSummary, researchResult, computeTarget } = task.payload as {
      datasetId: string;
      userQuery: string;
      edaSummary: EdaSummary;
      researchResult: Record<string, unknown>;
      computeTarget: unknown;
    };
    const runId = task.payload.runId as number;

    let plan: MLPlan | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      this.logStream.streamLine(runId, `[Plan] Generating ML plan (attempt ${attempt})...`, 'info');

      const rejectionNote = plan?.rejectionFeedback
        ? `\n\nUser rejected the previous plan with this feedback: "${plan.rejectionFeedback}". Please address this.`
        : '';

      const planJson = await complete({
        system: 'You are a senior ML engineer. Always respond with a single valid JSON object matching the requested schema. No markdown, no extra text.',
        messages: [
          {
            role: 'user',
            content: `Generate a comprehensive ML plan for this request.

User goal: ${userQuery}
Dataset ID: ${datasetId}
EDA Summary: ${JSON.stringify(edaSummary)}
Research result: ${JSON.stringify(researchResult)}
Compute target: ${JSON.stringify(computeTarget)}
${rejectionNote}

Return a JSON object with this schema:
{
  "id": "<uuid>",
  "datasetId": "${datasetId}",
  "createdAt": "<iso timestamp>",
  "status": "awaiting_approval",
  "userQuery": "${userQuery}",
  "objective": "<1 sentence describing the ML objective>",
  "taskType": "<one of: binary_classification|multiclass_classification|regression|clustering|time_series|nlp_classification|object_detection|unknown>",
  "edaSummary": <the provided edaSummary>,
  "proposedAlgorithm": {
    "primary": "<AlgorithmClass>",
    "library": "<pip package>",
    "alternativeConsidered": ["<alt1>", "<alt2>"],
    "rationale": "<2-3 sentences>",
    "hyperparameters": {}
  },
  "preprocessingSteps": [{"order": 1, "name": "", "description": "", "code": ""}],
  "trainingConfig": {
    "testSplitRatio": 0.2,
    "crossValidationFolds": 5,
    "randomSeed": 42
  },
  "computeTarget": <the provided computeTarget>
}`,
          },
        ],
        maxTokens: 4096,
      });

      try {
        const cleanJson = planJson.replace(/```json\n?|```/g, '').trim();
        plan = JSON.parse(cleanJson) as MLPlan;
        plan.id = plan.id || randomUUID();
        plan.createdAt = plan.createdAt || new Date().toISOString();
        plan.status = 'awaiting_approval';
        savePlan(plan);
      } catch (e) {
        this.logStream.streamLine(runId, `[Plan] Failed to parse plan JSON: ${e}`, 'error');
        continue;
      }

      // Signal renderer and await approval
      const approved = await onPlanReady(plan);
      if (approved) {
        plan.status = 'approved';
        savePlan(plan);
        return plan;
      }
      // If rejected, loop and regenerate with feedback
    }

    throw new Error('Plan generation failed after 3 attempts');
  }
}
