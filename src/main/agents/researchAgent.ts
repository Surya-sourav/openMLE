import { complete } from '../llm/client.js';
import { buildResearchPrompt } from '../llm/prompts/researchPrompts.js';
import type { Task } from '../types/task.js';
import type { EdaSummary, AlgorithmChoice, PreprocessingStep } from '../types/plan.js';
import type { ResearchResult } from '../types/agent.js';
import type { VectorKBService } from '../services/vectorKBService.js';
import type { LogStreamService } from '../services/logStreamService.js';

export class ResearchAgent {
  constructor(
    private vectorKB: VectorKBService,
    private logStream: LogStreamService,
  ) {}

  async run(task: Task): Promise<ResearchResult> {
    const { userQuery, edaSummary, taskType } = task.payload as {
      userQuery: string;
      edaSummary: EdaSummary;
      taskType: string;
    };
    const runId = task.payload.runId as number;

    this.logStream.streamLine(runId, '[Research] Querying knowledge base...', 'info');

    // Three targeted KB queries
    const queries = [
      `${taskType} algorithm selection best practices`,
      `preprocessing missing values ${edaSummary.missingValueColumns.slice(0, 3).join(' ')}`,
      edaSummary.classBalance ? `handling imbalanced dataset class distribution` : `feature engineering ${taskType}`,
    ];

    const kbResults = await Promise.all(
      queries.map((q) => this.vectorKB.hybridSearch(q, 8))
    );

    // Deduplicate by source
    const seen = new Set<string>();
    const allResults = kbResults.flat().filter((r) => {
      if (seen.has(r.source)) return false;
      seen.add(r.source);
      return true;
    });

    const kbContext = allResults
      .slice(0, 12)
      .map((r) => `[${r.source}] (score: ${r.score.toFixed(2)})\n${r.content}`)
      .join('\n\n---\n\n');

    this.logStream.streamLine(runId, `[Research] Retrieved ${allResults.length} KB results, consulting LLM...`, 'info');

    const response = await complete({
      system: 'You are a senior ML engineer. Always respond with a single valid JSON object. No markdown, no extra text.',
      messages: [
        {
          role: 'user',
          content: buildResearchPrompt({ userQuery, taskType: taskType as any, edaSummary, kbContext }),
        },
      ],
      maxTokens: 2048,
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(response.replace(/```json\n?|```/g, '').trim());
    } catch {
      throw new Error(`Research agent failed to produce valid JSON: ${response.slice(0, 200)}`);
    }

    const algorithmChoice: AlgorithmChoice = {
      primary: String(parsed.primary ?? 'RandomForestClassifier'),
      library: String(parsed.library ?? 'scikit-learn'),
      alternativeConsidered: (parsed.alternativeConsidered as string[]) ?? [],
      rationale: String(parsed.rationale ?? ''),
      hyperparameters: (parsed.hyperparameters as Record<string, unknown>) ?? {},
    };

    const preprocessingSteps: PreprocessingStep[] = ((parsed.preprocessingSteps as unknown[]) ?? []).map(
      (s: unknown, i: number) => {
        const step = s as Record<string, unknown>;
        return {
          order: typeof step.order === 'number' ? step.order : i + 1,
          name: String(step.name ?? `Step ${i + 1}`),
          description: String(step.description ?? ''),
          code: step.code ? String(step.code) : undefined,
        };
      }
    );

    this.logStream.streamLine(
      runId,
      `[Research] Selected algorithm: ${algorithmChoice.primary} from ${algorithmChoice.library}`,
      'info'
    );

    return {
      algorithmChoice,
      preprocessingSteps,
      taskType,
      rationale: algorithmChoice.rationale,
      kbSources: allResults.map((r) => r.source),
    };
  }
}
