import type { MLPlan } from '../../types/plan.js';

export function buildEvaluationScriptPrompt(plan: MLPlan, workspaceDir: string): string {
  return `You are a senior ML engineer. Generate a Python evaluation script.

Task type: ${plan.taskType}
Target column: ${plan.edaSummary.targetColumn}
Workspace directory: ${workspaceDir}
  - Model: ${workspaceDir}/model.pkl
  - Test indices: ${workspaceDir}/test_indices.npy
  - Processed dataset: ${workspaceDir}/processed.csv

The script must:
1. Load model, test indices, and processed dataset
2. Reconstruct the test split using the saved indices
3. Compute metrics appropriate for ${plan.taskType}:
   - Classification: accuracy, precision, recall, f1 (macro + per-class), roc_auc (if binary), confusion_matrix
   - Regression: mse, rmse, mae, r2
4. Save all metrics to ${workspaceDir}/eval_metrics.json
5. Print the metrics JSON to stdout
6. Handle exceptions and print {"error": "<message>"} on failure

Output ONLY the Python code inside a single \`\`\`python block.`;
}

export function buildReportPrompt(options: {
  plan: MLPlan;
  metrics: Record<string, unknown>;
  keyFindings: string[];
}): string {
  return `You are a senior ML engineer. Write a concise markdown evaluation report for the following ML training run.

Dataset: ${options.plan.datasetId}
Objective: ${options.plan.objective}
Algorithm: ${options.plan.proposedAlgorithm.primary} (${options.plan.proposedAlgorithm.library})
Task type: ${options.plan.taskType}

EDA Key Findings:
${options.keyFindings.map((f) => `- ${f}`).join('\n')}

Preprocessing applied:
${options.plan.preprocessingSteps.map((s) => `${s.order}. ${s.name}`).join('\n')}

Evaluation Metrics:
${JSON.stringify(options.metrics, null, 2)}

Write a markdown report with sections:
1. # Model Evaluation Report
2. ## Dataset Summary
3. ## Model Selection
4. ## Preprocessing
5. ## Performance Metrics (use a markdown table)
6. ## Interpretation
7. ## Recommended Next Steps

Be concise and use plain English. Do not include any code blocks.`;
}
