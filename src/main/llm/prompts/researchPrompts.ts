import type { EdaSummary, MLTaskType } from '../../types/plan.js';

export function buildResearchPrompt(options: {
  userQuery: string;
  taskType: MLTaskType;
  edaSummary: EdaSummary;
  kbContext: string;
}): string {
  return `You are a senior ML engineer. Based on the dataset analysis and knowledge base context below, select the best machine learning algorithm for this task.

User goal: ${options.userQuery}
Inferred task type: ${options.taskType}

EDA Summary:
- Rows: ${options.edaSummary.rowCount}, Columns: ${options.edaSummary.columnCount}
- Target column: ${options.edaSummary.targetColumn}
- Missing value columns: ${options.edaSummary.missingValueColumns.join(', ') || 'none'}
- High cardinality columns: ${options.edaSummary.highCardinalityColumns.join(', ') || 'none'}
- Key findings: ${options.edaSummary.keyFindings.join('; ')}

Relevant knowledge base context:
${options.kbContext}

Return ONLY a valid JSON object with this exact schema:
{
  "primary": "<AlgorithmClassName>",
  "library": "<pip_package_name>",
  "libraryImport": "<python import statement>",
  "alternativeConsidered": ["<alt1>", "<alt2>"],
  "rationale": "<2-3 sentences explaining the choice>",
  "hyperparameters": { "<param>": <value> },
  "preprocessingSteps": [
    { "order": 1, "name": "<step name>", "description": "<what it does>", "code": "<optional python snippet>" }
  ]
}`;
}
