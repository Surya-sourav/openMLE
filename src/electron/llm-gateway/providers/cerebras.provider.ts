import Cerebras from '@cerebras/cerebras_cloud_sdk';
import type { llmconn } from '../../internal-database/schemas/llmconn.schema.js';
import type { llmconnreq } from '../../internal-database/repositories/llmconn.repository.js';

export class CerebrasProvider {
  private client: Cerebras | null = null;
  private connectionInfo: llmconn | null = null;

  async connect(connection: llmconn): Promise<Cerebras> {
    try {
      this.client = new Cerebras({ apiKey: connection.key });
      await this.testConnection();
      this.connectionInfo = connection;
      console.log(`✅ Cerebras provider connected for model: ${connection.model || 'llama3.1-8b'}`);
      return this.client;
    } catch (error) {
      console.error(' Cerebras connection failed:', error);
      this.client = null;
      this.connectionInfo = null;
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) throw new Error('Cerebras client not initialised');
    try {
      // Lightweight validation: minimal 1-token completion
      await this.client.chat.completions.create({
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: 'Hi' }],
        max_completion_tokens: 1,
        stream: false,
      });
      return true;
    } catch (error) {
      throw new Error(`Cerebras connection test failed: ${error}`);
    }
  }

  async isValidConnection(connection: llmconnreq): Promise<boolean> {
    try {
      const temp = new Cerebras({ apiKey: connection.key });
      await temp.chat.completions.create({
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: 'Hi' }],
        max_completion_tokens: 1,
        stream: false,
      });
      return true;
    } catch {
      return false;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  disconnect(): void {
    this.client = null;
    this.connectionInfo = null;
    console.log('Cerebras provider disconnected');
  }

  getModel(): string {
    return this.connectionInfo?.model || 'llama3.1-8b';
  }
}
