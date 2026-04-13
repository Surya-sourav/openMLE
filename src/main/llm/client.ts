import { config } from '../config.js';

export interface MessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

async function resolveApiKey(): Promise<string> {
  // Ensure .env is loaded — safe to call multiple times (won't override existing vars)
  const { default: dotenv } = await import('dotenv') as { default: typeof import('dotenv') };
  dotenv.config();
  _client = null; // reset so new key/model takes effect

  if (config.cerebrasApiKey) return config.cerebrasApiKey;

  try {
    const { getDatabase } = await import('../../electron/internal-database/local.database-config.js');
    const { llmconn } = await import('../../electron/internal-database/schemas/llmconn.schema.js');
    const { eq, desc } = await import('drizzle-orm');
    const db = getDatabase();
    const row = db
      .select({ key: llmconn.key })
      .from(llmconn)
      .where(eq(llmconn.provider, 'cerebras'))
      .orderBy(desc(llmconn.id))
      .limit(1)
      .get();
    if (row?.key) return row.key;
  } catch {
    // DB not yet initialised
  }

  throw new Error(
    'No Cerebras API key found. Add one via Settings (provider: cerebras).',
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getClient(): Promise<any> {
  if (_client) return _client;
  const apiKey = await resolveApiKey();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { default: Cerebras } = (await import('@cerebras/cerebras_cloud_sdk')) as any;
  _client = new Cerebras({ apiKey });
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

const DEFAULT_MODEL = 'llama3.1-8b';

export async function complete(options: CompleteOptions): Promise<string> {
  const client = await getClient();
  const allMessages = [
    { role: 'system', content: options.system },
    ...options.messages,
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).chat.completions.create({
    model:                options.model ?? DEFAULT_MODEL,
    max_completion_tokens: options.maxTokens ?? 4096,
    messages:             allMessages,
    temperature:          0.2,
    top_p:                1,
    stream:               false,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (response as any).choices[0]?.message?.content ?? '';
}

export async function* stream(options: CompleteOptions): AsyncGenerator<string> {
  const client = await getClient();
  const allMessages = [
    { role: 'system', content: options.system },
    ...options.messages,
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks = await (client as any).chat.completions.create({
    model:                options.model ?? DEFAULT_MODEL,
    max_completion_tokens: options.maxTokens ?? 4096,
    messages:             allMessages,
    temperature:          0.2,
    top_p:                1,
    stream:               true,
  });
  for await (const chunk of chunks) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = (chunk as any).choices[0]?.delta?.content;
    if (text) yield text as string;
  }
}
