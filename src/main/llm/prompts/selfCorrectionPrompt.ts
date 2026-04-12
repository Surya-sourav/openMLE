export function buildSelfCorrectionPrompt(options: {
  originalCode: string;
  errorMessage: string;
  traceback: string;
  attemptNumber: number;
}): string {
  return `You previously generated the following Python code:

\`\`\`python
${options.originalCode}
\`\`\`

When executed, it produced the following error (attempt ${options.attemptNumber} of 3):

Error: ${options.errorMessage}

Traceback:
${options.traceback}

Diagnose the root cause of this error and produce a corrected version of the complete Python script. Output ONLY the corrected Python code inside a single \`\`\`python block with no other text. Do not truncate the script.`;
}
