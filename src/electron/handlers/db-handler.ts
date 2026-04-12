import { ipcMain } from 'electron';
import { ConnectionService } from '../services/connection.sevice.js';

export class DBHandler {
  constructor(connectionService: ConnectionService) {
    this.connectionService = connectionService;
  }

  private readonly connectionService: ConnectionService;

  public registerHandlers(): void {
    ipcMain.handle('database/get_all_connections', async () => {
      return await this.connectionService.getAllConnections();
    });

    //Save new connections :
    ipcMain.handle('database/get_default_connection', async () => {
      return await this.connectionService.getDefaultConnection();
    });

    // save new connection :
    ipcMain.handle('database/save_connection', async (event, connection, setAsDefault) => {
      return await this.connectionService.saveConnection(connection, setAsDefault);
    });

    // Set Default Connection :
    ipcMain.handle('database/set_default_connection', async (event, id) => {
      await this.connectionService.setDefaultConnection(id);
      return { success: true };
    });

    //Connect to the Database
    ipcMain.handle('database/connect', async (event, id) => {
      try {
        await this.connectionService.connectToDatabase(id);
        return { success: true, message: 'connected successfully' };
      } catch (error: any) {
        return { success: false, message: error };
      }
    });

    ipcMain.handle('database/disconnect', async (event, id) => {
      await this.connectionService.disconnectConnection(id);
      return { success: true };
    });

    // Delete Connection
    ipcMain.handle('database/delete_connection', async (event, id) => {
      await this.connectionService.deleteConnection(id);
    });

    // Check if connection is active
    ipcMain.handle('database/isactive_connection', (event, id) => {
      return this.connectionService.isConnectionActive(id);
    });

    // Get active connector for queries
    ipcMain.handle('database/getactive_connection', (event, id) => {
      return this.connectionService.getActiveConnection(id);
    });

    console.log('Database IPC Handlers Registered');
  }
}
