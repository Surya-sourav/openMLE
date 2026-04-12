import type { DatasetMeta } from '../../types/dataset.js';

export function buildEdaScriptPrompt(dataset: DatasetMeta): string {
  const columnList = dataset.columns.map((c) => `${c.name} (${c.dtype})`).join(', ');
  return `You are an expert data scientist. Generate a Python script that performs exploratory data analysis on a CSV dataset and outputs a single JSON object to stdout.

Dataset info:
- File path: passed as sys.argv[1]
- Columns: ${columnList}
- Row count estimate: ${dataset.rowCount}

The script must:
1. Load the CSV with pandas (handle encoding errors gracefully)
2. Print a SINGLE valid JSON object to stdout (use json.dumps) with this exact schema:
{
  "rowCount": <int>,
  "columnCount": <int>,
  "columns": [
    {
      "name": "<str>",
      "dtype": "<str>",
      "nullCount": <int>,
      "uniqueCount": <int>,
      "sample": [<up to 5 values>],
      "mean": <float or null>,
      "std": <float or null>
    }
  ],
  "correlations": [{"col1": "<str>", "col2": "<str>", "r": <float>}],
  "missingValueColumns": ["<col_name>"],
  "highCardinalityColumns": ["<col_name>"],
  "classDistribution": {"<label>": <count>}
}
3. Never import matplotlib or show any plots
4. Handle all exceptions and always output valid JSON (wrap in try/except)
5. Accept the dataset file path as sys.argv[1]

Output ONLY the Python code inside a single \`\`\`python block.`;
}

export function buildEdaSummaryPrompt(rawStats: string): string {
  return `You are an expert data scientist. Convert the following raw EDA statistics JSON into a list of 6-8 clear, plain-English bullet-point findings for a non-technical stakeholder.

Raw statistics:
${rawStats}

Focus on:
- Dataset size and completeness
- Notable missing data issues
- Target variable distribution / class balance
- Surprising correlations or outlier columns
- Potential preprocessing challenges

Return ONLY a JSON array of strings (the bullet points), no other text. Example:
["Finding 1", "Finding 2", "Finding 3"]`;
}
