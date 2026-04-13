import {
  llmconn,
  LLMconnrepository,
} from '../../internal-database/repositories/llmconn.repository.js';
import { CerebrasProvider } from '../providers/cerebras.provider.js';
import type { LLMConnectionListItem as listllm } from '../interfaces/requests/listllmconnection.request.js';
import type { CreateLLMConnectionRequest as llmconnreq } from '../interfaces/requests/createllmconnection.request.js';
import type { LLMConnectionResponse as llmconnres } from '../../internal-database/repositories/llmconn.repository.js';
import type { UpdateLLMConnectionRequest as updatellmconn } from '../interfaces/requests/updatellmconnection.request.js';
import { createOpenAI } from '@ai-sdk/openai';

const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1';

export class LLMservice {
  private static instance: LLMservice | null = null;
  private llmrepository: LLMconnrepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public defaultllm: (llmconn & { model: any }) | null = null;
  private cerebrasprovider: CerebrasProvider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private existingconnections: Map<number, any> = new Map();

  public constructor() {
    this.llmrepository = new LLMconnrepository();
    this.cerebrasprovider = new CerebrasProvider();
  }

  public static getInstance(): LLMservice {
    if (!LLMservice.instance) {
      LLMservice.instance = new LLMservice();
    }
    return LLMservice.instance;
  }

  async saveconnection(connection: llmconnreq): Promise<llmconnres> {
    try {
      if (!await this.isLlmValid(connection)) {
        throw new Error(`LLM connection is not valid — provided API key failed validation.`);
      }

      const savedconnection = this.llmrepository.saveConnection(connection);
      const response: llmconnres = {
        ...savedconnection,
        is_default: savedconnection.is_default ?? false,
      };

      if (connection.is_default) {
        this.llmrepository.setDefaultLlm(savedconnection.id);
        console.log(`✅ LLM ${savedconnection.provider} saved as default`);
      } else {
        console.log(`✅ LLM ${savedconnection.provider} saved`);
      }

      return response;
    } catch (error) {
      console.error(' Error saving LLM connection:', error);
      throw error;
    }
  }

  async getAllConnections(): Promise<listllm[]> {
    try {
      return this.llmrepository.getExistingConfigurations();
    } catch (error) {
      console.error(' Error getting all LLM connections:', error);
      throw error;
    }
  }

  async getConnection(id: number): Promise<llmconn | null> {
    try {
      return this.llmrepository.getLlmConnection(id);
    } catch (error) {
      console.error(' Error getting LLM connection:', error);
      throw error;
    }
  }

  async getDefaultLLM(): Promise<llmconn | null> {
    try {
      return this.llmrepository.getDefaultLlm();
    } catch (error) {
      console.error(' Error getting default LLM:', error);
      throw error;
    }
  }

  async setdefaultllm(id: number): Promise<void> {
    try {
      this.llmrepository.setDefaultLlm(id);
      console.log(`Default LLM set to ${id}`);
    } catch (error) {
      console.error(' Error setting default LLM:', error);
      throw error;
    }
  }

  async updateConnection(id: number, updates: updatellmconn): Promise<llmconnres> {
    try {
      if (this.existingconnections.has(id)) {
        this.existingconnections.delete(id);
      }
      const updatedConnection = this.llmrepository.updateConnection(id, updates);
      console.log(`✅ LLM connection ${id} updated`);
      return updatedConnection;
    } catch (error) {
      console.error(' Error updating LLM connection:', error);
      throw error;
    }
  }

  /**
   * Initialize the default LLM model object for the SQL Agent (Vercel AI SDK).
   * Cerebras is OpenAI-compatible, so we use @ai-sdk/openai with a custom base URL.
   */
  async initializellm(): Promise<void> {
    try {
      const defaultllm = this.llmrepository.getDefaultLlm();
      if (!defaultllm) {
        console.log(' No default LLM configured');
        return;
      }

      console.log(`Default LLM found: ${defaultllm.provider} - ${defaultllm.model}`);

      if (defaultllm.provider.toLowerCase() !== 'cerebras') {
        throw new Error(`Unsupported LLM provider: ${defaultllm.provider}`);
      }

      // Cerebras is OpenAI-compatible — use @ai-sdk/openai with the Cerebras base URL
      const cerebrasCompat = createOpenAI({
        apiKey:  defaultllm.key,
        baseURL: CEREBRAS_BASE_URL,
        name:    'cerebras',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aiModel = cerebrasCompat(defaultllm.model || 'llama3.1-8b') as any;

      this.defaultllm = { ...defaultllm, model: aiModel };
      console.log(`✅ LLM Model initialised: cerebras/${defaultllm.model || 'llama3.1-8b'}`);

      await this.connectllm(defaultllm.id);
    } catch (error) {
      console.error(' Error initialising LLM:', error);
      throw error;
    }
  }

  async connectllm(id: number): Promise<unknown> {
    try {
      const connection = this.llmrepository.getLlmConnection(id);
      if (!connection) throw new Error(`Connection ${id} not found`);

      if (this.existingconnections.has(connection.id!)) {
        return this.existingconnections.get(connection.id!);
      }

      if (connection.provider.toLowerCase() !== 'cerebras') {
        throw new Error(`Unsupported LLM provider: ${connection.provider}`);
      }

      const connector = await this.cerebrasprovider.connect(connection);
      this.existingconnections.set(connection.id!, connector);
      console.log(`✅ Connected to LLM ${id}`);
      return connector;
    } catch (error) {
      console.error('❌ Error connecting to LLM:', error);
      throw error;
    }
  }

  async disconnectLLM(id: number): Promise<void> {
    try {
      const connection = this.llmrepository.getLlmConnection(id);
      if (connection && this.existingconnections.has(connection.id!)) {
        const connector = this.existingconnections.get(connection.id!);
        if (connector && typeof connector.disconnect === 'function') {
          connector.disconnect();
        }
        this.existingconnections.delete(connection.id!);
        console.log(` Disconnected from LLM ${id}`);
      }
    } catch (error) {
      console.error('Error disconnecting LLM:', error);
      throw error;
    }
  }

  isConnected(id: number): boolean {
    try {
      const connection = this.llmrepository.getLlmConnection(id);
      return connection ? this.existingconnections.has(connection.id!) : false;
    } catch {
      return false;
    }
  }

  async isLlmValid(connection: llmconnreq): Promise<boolean> {
    if (connection.provider.toLowerCase() !== 'cerebras') {
      throw new Error(`Unsupported provider: ${connection.provider}. Only 'cerebras' is supported.`);
    }
    return this.cerebrasprovider.isValidConnection(connection);
  }
}
