import type { MLPlan } from '../../types/plan.js';

export function buildPreprocessingScriptPrompt(plan: MLPlan, datasetPath: string): string {
  const steps = plan.preprocessingSteps
    .map((s) => `${s.order}. ${s.name}: ${s.description}`)
    .join('\n');

  return `You are a senior ML engineer. Generate a Python preprocessing script.

Dataset path: ${datasetPath}
Target column: ${plan.edaSummary.targetColumn}
Feature columns: all except target
Output path: passed as sys.argv[2]

Preprocessing steps to apply in order:
${steps}

The script must:
1. Accept input CSV path as sys.argv[1] and output path as sys.argv[2]
2. Apply all preprocessing steps in order
3. Save the processed dataset to sys.argv[2]
4. Print a JSON summary to stdout: {"rowsBefore": N, "rowsAfter": N, "stepsApplied": [...]}
5. Handle exceptions gracefully and print {"error": "<message>"} on failure

Output ONLY the Python code inside a single \`\`\`python block.`;
}

export function buildTrainingScriptPrompt(plan: MLPlan, processedDatasetPath: string, outputDir: string): string {
  const hp = JSON.stringify(plan.proposedAlgorithm.hyperparameters, null, 2);

  return `You are a senior ML engineer. Generate a complete, runnable Python training script.

Task type: ${plan.taskType}
Algorithm: ${plan.proposedAlgorithm.primary} from ${plan.proposedAlgorithm.library}
Target column: ${plan.edaSummary.targetColumn}
Processed dataset path: ${processedDatasetPath}
Output directory: ${outputDir}
Test split ratio: ${plan.trainingConfig.testSplitRatio}
CV folds: ${plan.trainingConfig.crossValidationFolds}
Random seed: ${plan.trainingConfig.randomSeed}
Hyperparameters: ${hp}

The script must:
1. Accept no arguments (use hardcoded paths from above)
2. Load processed.csv, split into train/test sets
3. Fit the model with the specified hyperparameters
4. Save the model to ${outputDir}/model.pkl using joblib.dump
5. Save test indices to ${outputDir}/test_indices.npy using numpy
6. Save metrics to ${outputDir}/metrics.json
7. Print JSON progress lines to stdout every epoch/fold: {"level": "info", "message": "...", "progress": 0.0-1.0}
8. Print final line: {"level": "done", "metrics": {...}}
9. Handle errors and print {"level": "error", "message": "<traceback>"} on failure

Output ONLY the Python code inside a single \`\`\`python block.`;
}
