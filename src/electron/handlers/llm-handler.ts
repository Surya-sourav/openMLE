import { ipcMain, IpcMain } from 'electron';
import { LLMservice } from '../llm-gateway/services/llm.service.js';
import { llmconnreq } from '../internal-database/repositories/llmconn.repository.js';
import { UpdateLLMConnectionRequest as updatellmconn } from '../llm-gateway/interfaces/requests/updatellmconnection.request.js';

export class LLMhandler {
  private readonly llmservice: LLMservice;
  constructor(llmservice: LLMservice) {
    this.llmservice = llmservice;
  }

  public registerllmhandlers(): void {
    ipcMain.handle('llm/saveconnection', async (event, connection: llmconnreq) => {
      try {
        return await this.llmservice.saveconnection(connection);
      } catch (error) {
        console.error(' Error Saving LLM Connection:', error);
        throw error;
      }
    });

    ipcMain.handle('llm/getconnections', async (event) => {
      try {
        return await this.llmservice.getAllConnections();
      } catch (error) {
        console.error(' Error Getting LLM Connections:', error);
        throw error;
      }
    });

    ipcMain.handle('llm/getconnection', async (event, id: number) => {
      try {
        return await this.llmservice.getConnection(id);
      } catch (error) {
        console.error(' Error Getting LLM Connection:', error);
        throw error;
      }
    });

    ipcMain.handle('llm/getdefault', async (event) => {
      try {
        return await this.llmservice.getDefaultLLM();
      } catch (error) {
        console.error(' Error Getting Default LLM:', error);
        throw error;
      }
    });

    ipcMain.handle('llm/setdefaultllm', async (event, id: number) => {
      try {
        return await this.llmservice.setdefaultllm(id);
      } catch (error) {
        console.error(' Error Setting Default LLM:', error);
        throw error;
      }
    });

    ipcMain.handle('llm/updateconnection', async (event, id: number, updates: updatellmconn) => {
      try {
        return await this.llmservice.updateConnection(id, updates);
      } catch (error) {
        console.error(' Error Updating LLM Connection:', error);
        throw error;
      }
    });

    ipcMain.handle('llm/connect', async (event, id: number) => {
      try {
        return await this.llmservice.connectllm(id);
      } catch (error) {
        console.error(' Error Connecting to LLM:', error);
        throw error;
      }
    });

    ipcMain.handle('llm/disconnect', async (event, id: number) => {
      try {
        return await this.llmservice.disconnectLLM(id);
      } catch (error) {
        console.error(' Error Disconnecting LLM:', error);
        throw error;
      }
    });

    console.log(' LLM handlers are registered');
  }
}
