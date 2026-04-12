import { config } from '../config.js';

// Local type aliases — replaced by real Anthropic types once the SDK is installed
export interface MessageParam {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; [k: string]: unknown }>;
}
interface TextBlock { type: 'text'; text: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

async function resolveApiKey(): Promise<string> {
  if (config.anthropicApiKey) return config.anthropicApiKey;

  try {
    const { getDatabase } = await import('../../electron/internal-database/local.database-config.js');
    const { llmconn } = await import('../../electron/internal-database/schemas/llmconn.schema.js');
    const { eq, desc } = await import('drizzle-orm');
    const db = getDatabase();
    const row = db
      .select({ key: llmconn.key })
      .from(llmconn)
      .where(eq(llmconn.provider, 'anthropic'))
      .orderBy(desc(llmconn.id))
      .limit(1)
      .get();
    if (row?.key) return row.key;
  } catch {
    // DB not yet initialised
  }

  throw new Error(
    'No Anthropic API key found. Add one via Settings → LLM Connections (provider: anthropic).'
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getClient(): Promise<any> {
  if (_client) return _client;
  const apiKey = await resolveApiKey();
  // Dynamic import so the app loads even when @anthropic-ai/sdk is not yet installed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { default: Anthropic } = await import('@anthropic-ai/sdk') as any;
  _client = new Anthropic({ apiKey });
  return _client;
}

export function invalidateClient(): void {
  _client = null;
}

// ── High-level helpers ────────────────────────────────────────────────────────

export interface CompleteOptions {
  system: string;
  messages: MessageParam[];
  maxTokens?: number;
  model?: string;
}

export async function complete(options: CompleteOptions): Promise<string> {
  const client = await getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).messages.create({
    model:      options.model ?? 'claude-opus-4-5',
    max_tokens: options.maxTokens ?? 4096,
    system:     options.system,
    messages:   options.messages,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const block = (response.content as any[]).find((b: { type: string }) => b.type === 'text') as TextBlock | undefined;
  return block?.text ?? '';
}

export async function* stream(options: CompleteOptions): AsyncGenerator<string> {
  const client = await getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (client as any).messages.stream({
    model:      options.model ?? 'claude-opus-4-5',
    max_tokens: options.maxTokens ?? 4096,
    system:     options.system,
    messages:   options.messages,
  });
  for await (const event of s) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = event as any;
    if (e.type === 'content_block_delta' && e.delta?.type === 'text_delta') {
      yield e.delta.text as string;
    }
  }
}
