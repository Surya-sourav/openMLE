import { complete, type MessageParam } from '../llm/client.js';

interface MemoryEntry {
  role: 'user' | 'assistant' | 'system_event';
  content: string;
  timestamp: string;
  tokenEstimate: number;
}

export class SessionMemory {
  private entries: MemoryEntry[] = [];
  private readonly maxTokenBudget = 80_000;

  add(role: MemoryEntry['role'], content: string): void {
    this.entries.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      tokenEstimate: Math.ceil(content.length / 4),
    });
  }

  async getMessages(): Promise<MessageParam[]> {
    const total = this.entries.reduce((s, e) => s + e.tokenEstimate, 0);
    if (total > this.maxTokenBudget) {
      await this.trimTobudget();
    }

    return this.entries
      .filter((e) => e.role !== 'system_event')
      .map((e) => ({
        role: e.role as 'user' | 'assistant',
        content: e.content,
      }));
  }

  private async trimTobudget(): Promise<void> {
    const cutoff = Math.floor(this.entries.length * 0.3);
    const toSummarise = this.entries.splice(0, cutoff);
    const summary = await this.summarise(toSummarise);
    this.entries.unshift({
      role: 'user',
      content: `[Conversation summary]: ${summary}`,
      timestamp: new Date().toISOString(),
      tokenEstimate: Math.ceil(summary.length / 4),
    });
  }

  private async summarise(entries: MemoryEntry[]): Promise<string> {
    const text = entries.map((e) => `${e.role}: ${e.content}`).join('\n\n');
    return complete({
      system: 'You are a helpful assistant that summarises conversations concisely.',
      messages: [{ role: 'user', content: `Summarise the key facts from this conversation:\n\n${text}` }],
      maxTokens: 512,
    });
  }

  clear(): void {
    this.entries = [];
  }
}
