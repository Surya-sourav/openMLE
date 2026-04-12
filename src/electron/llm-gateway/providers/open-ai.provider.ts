import OpenAI from 'openai';
import { llmconn } from '../../internal-database/schemas/llmconn.schema.js';
import { llmconnreq } from '../../internal-database/repositories/llmconn.repository.js';

export class Openaiprovider {
  private client: OpenAI | null = null;
  private connectionInfo: llmconn | null = null;

  async connect(connection: llmconn): Promise<OpenAI> {
    try {
      this.client = new OpenAI({
        apiKey: connection.key,
      });

      // Test the connection to ensure it's valid
      await this.testConnection();

      this.connectionInfo = connection;
      console.log(
        ` OpenAI provider connected successfully for model: ${connection.model || 'default'}`,
      );

      return this.client;
    } catch (error) {
      console.error(' OpenAI connection failed:', error);
      this.client = null;
      this.connectionInfo = null;
      throw error;
    }
  }

  getClient(): OpenAI | null {
    if (!this.client) {
      console.warn(' OpenAI client not connected. Call connect() first.');
      return null;
    }
    return this.client;
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Simple test to verify API key works
      await this.client.models.list();
      return true;
    } catch (error) {
      throw new Error(`OpenAI connection test failed: ${error}`);
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  disconnect(): void {
    this.client = null;
    this.connectionInfo = null;
    console.log('OpenAI provider disconnected');
  }

  getConnectionInfo(): llmconn | null {
    return this.connectionInfo;
  }

  getModel(): string {
    return this.connectionInfo?.model || 'gpt-3.5-turbo';
  }

  async isValidConnection(connection : llmconnreq): Promise<boolean> {
  
  // Creating A temp client for llm connection test 
  let tempClient = new OpenAI({
    apiKey : connection.key,
  })
    try {
      // Simple test to verify API key works
      await tempClient.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }
}
