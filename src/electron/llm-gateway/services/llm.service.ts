import {
  llmconn,
  LLMconnrepository,
} from '../../internal-database/repositories/llmconn.repository.js';
import { Openaiprovider } from '../providers/open-ai.provider.js';
import { LLMConnectionListItem as listllm } from '../interfaces/requests/listllmconnection.request.js';
import { CreateLLMConnectionRequest as llmconnreq } from '../interfaces/requests/createllmconnection.request.js';
import { LLMConnectionResponse as llmconnres } from '../../internal-database/repositories/llmconn.repository.js';
import { UpdateLLMConnectionRequest as updatellmconn } from '../interfaces/requests/updatellmconnection.request.js';
import { createOpenAI } from '@ai-sdk/openai';

export class LLMservice {
  private static instance: LLMservice | null = null;
  private llmrepository: LLMconnrepository;
  public defaultllm: (llmconn & { model: any }) | null = null; // model is the AI SDK model object
  private openaiprovider: Openaiprovider;
  private existingconnections: Map<number, any> = new Map();

  public constructor() {
    this.llmrepository = new LLMconnrepository();
    this.openaiprovider = new Openaiprovider();
  }

  /**
   * Get the singleton instance of LLMservice
   */
  public static getInstance(): LLMservice {
    if (!LLMservice.instance) {
      LLMservice.instance = new LLMservice();
    }
    return LLMservice.instance;
  }

  /*
   * Save a LLM Connection
   */
  async saveconnection(connection: llmconnreq): Promise<llmconnres> {
    try {

      /* Check whether the Connection is Valid or not */
        if(!await this.isLlmValid(connection))
        {
          throw new Error(`LLM Conection is not valid ; provided API key is wrong ${connection.key}`);
        }

      const savedconnection = this.llmrepository.saveConnection(connection);

      const response: llmconnres = {
        ...savedconnection,
        is_default: savedconnection.is_default ?? false,
      };

      if (connection.is_default) {
        this.llmrepository.setDefaultLlm(savedconnection.id);
        console.log(` LLM ${savedconnection.provider} Saved & is default now...`);
      } else {
        console.log(`LLM ${savedconnection.provider} Saved`);
      }

      return response;
    } catch (error) {
      console.error(' Error saving LLM connection:', error);
      throw error;
    }
  }

  /*
   * List all the existing LLM Connections
   */
  async getAllConnections(): Promise<listllm[]> {
    try {
      return this.llmrepository.getExistingConfigurations();
    } catch (error) {
      console.error(' Error getting all LLM connections:', error);
      throw error;
    }
  }

  /*
   * Get a Particular LLM Connection
   */
  async getConnection(id: number): Promise<llmconn | null> {
    try {
      return this.llmrepository.getLlmConnection(id);
    } catch (error) {
      console.error(' Error getting LLM connection:', error);
      throw error;
    }
  }

  /*
   *  Get the Default LLM
   */
  async getDefaultLLM(): Promise<llmconn | null> {
    try {
      return this.llmrepository.getDefaultLlm();
    } catch (error) {
      console.error(' Error getting default LLM:', error);
      throw error;
    }
  }

  /*
   * Set the default LLM
   */
  async setdefaultllm(id: number): Promise<void> {
    try {
      this.llmrepository.setDefaultLlm(id);
      console.log(`Default LLM set to ${id}`);
    } catch (error) {
      console.error(' Error setting default LLM:', error);
      throw error;
    }
  }

  /*
   * Update the LLM Connection
   */
  async updateConnection(id: number, updates: updatellmconn): Promise<llmconnres> {
    try {
      // Disconnect if currently active
      if (this.existingconnections.has(id)) {
        this.existingconnections.delete(id);
        console.log(` Disconnected LLM connection ${id} for update`);
      }

      const updatedConnection = this.llmrepository.updateConnection(id, updates);
      console.log(` LLM connection ${id} updated`);

      return updatedConnection;
    } catch (error) {
      console.error(' Error updating LLM connection:', error);
      throw error;
    }
  }

  /*
   *initialize a LLM provider to be used by the SQL Agent
   */
  async initializellm(): Promise<void> {
    try {
      const defaultllm = this.llmrepository.getDefaultLlm();

      if (!defaultllm) {
        console.log(' No default LLM configured');
        return;
      }
      
      console.log(`Default LLM found: ${defaultllm.provider} - ${defaultllm.model}`);

      // Create the AI SDK model object with API key from database
      let aiModel: any;
      
      switch (defaultllm.provider.toLowerCase()) {
        case 'openai':
          const openai = createOpenAI({
            apiKey: defaultllm.key,
          });
          aiModel = openai(defaultllm.model); // e.g., 'gpt-4', 'gpt-3.5-turbo'
          break;
          
        case 'anthropic':
          // Future: add anthropic support
          throw new Error('Anthropic provider not implemented yet');
          
        default:
          throw new Error(`Unsupported LLM provider: ${defaultllm.provider}`);
      }

      // Store the connection info with the AI SDK model object
      this.defaultllm = {
        ...defaultllm,
        model: aiModel, // Override with AI SDK model object
      };

      console.log(`✅ LLM Model initialized: ${defaultllm.provider}/${defaultllm.model}`);

      // Also connect through the provider for other operations
      await this.connectllm(defaultllm.id);
    } catch (error) {
      console.error(' Error initializing LLM:', error);
      throw error;
    }
  }

  /*
   * Connect the LLM accordingly to the above initialized llm method
   */
  async connectllm(id: number): Promise<any> {
    try {
      const connection = this.llmrepository.getLlmConnection(id);

      if (!connection) {
        throw new Error(`Connection for ${id} not found`);
      }

      // Check if already connected
      if (this.existingconnections.has(connection.id!)) {
        console.log(` Already connected to ${id}`);
        return this.existingconnections.get(connection.id!);
      }

      let connector: any;

      switch (connection.provider.toLowerCase()) {
        case 'openai':
          //  FIX: Proper provider connection
          connector = await this.openaiprovider.connect(connection);
          break;

        case 'anthropic':
          // Future implementation
          throw new Error('Anthropic provider not implemented yet');

        default:
          throw new Error(`Unsupported LLM Provider: ${connection.provider}`);
      }

      this.existingconnections.set(connection.id!, connector);
      console.log(` Connected to ${id}`);

      return connector;
    } catch (error) {
      console.error('❌ Error connecting to LLM:', error);
      throw error;
    }
  }

  /*
   * Disconnect the LLM
   */
  async disconnectLLM(id : number): Promise<void> {
    try {
      const connection = this.llmrepository.getLlmConnection(id);

      if (connection && this.existingconnections.has(connection.id!)) {
        const connector = this.existingconnections.get(connection.id!);

        // Call disconnect method if available
        if (connector && typeof connector.disconnect === 'function') {
          connector.disconnect();
        }

        this.existingconnections.delete(connection.id!);
        console.log(` Disconnected from ${id}`);
      } else {
        console.log(`ℹ ${id} was not connected`);
      }
    } catch (error) {
      console.error('Error disconnecting LLM:', error);
      throw error;
    }
  }

  isConnected(id : number): boolean {
    try {
      const connection = this.llmrepository.getLlmConnection(id);
      return connection ? this.existingconnections.has(connection.id!) : false;
    } catch (error) {
      console.error(' Error checking connection status:', error);
      return false;
    }
  }

  getActiveConnectionsCount(): number {
    return this.existingconnections.size;
  }

  async isLlmValid(connection : llmconnreq) : Promise<Boolean>
  {
    let isValid : any;
    switch(connection.provider.toLocaleLowerCase())
    {
      case 'openai' :
        isValid = await this.openaiprovider.isValidConnection(connection);
        break;
    }
    return isValid?true : false;
  }
}
