import {
  ConnectionRepository,
  Connection,
} from '../internal-database/repositories/connection.repository.js';
import { PostgresConnector } from '../db-connectors/postgres-connector.js';
import { CreateConnection } from '../interfaces/requests/create-connection.request.js';

export class ConnectionService {
  private static instance: ConnectionService | null = null;
  private repository: ConnectionRepository;
  private activeConections: Map<number, any> = new Map();
  private defaultConnectionId: number | null = null;
  private PostgresConnector: PostgresConnector;
  public client : any | null;

  constructor() {
    this.repository = new ConnectionRepository();
    this.PostgresConnector = new PostgresConnector();
  }

  /**
   * Get the singleton instance of ConnectionService
   */
  public static async getInstance(connectionId: number): Promise<ConnectionService> {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    // Connect to the user selected database and set the client
    await ConnectionService.instance.connectToDatabase(connectionId);
    
    return ConnectionService.instance;
  }

  async initializeConnection(): Promise<void> {
    const defaultConnection = await this.repository.getDefaultConnection();
    if (defaultConnection) {
      this.defaultConnectionId = defaultConnection.id!;
      console.log(`Default Connection Found : ${defaultConnection.connector}`);
    } else {
      console.log('No Default Connection Set');
    }
  }

  async autoConnectDefault(): Promise<boolean> {
    try {
      const defaultConnection = await this.repository.getDefaultConnection();
      if (!defaultConnection) {
        console.log('No Default Connection to auto-connect');
        return false;
      }

      console.log(`Auto Connecting to default db : ${defaultConnection.connector}...`);
      // Connect to the Database
      await this.connectToDatabase(defaultConnection.id!);
      console.log(`Auto Connected to ${defaultConnection.connector}`);
      return true;
    } catch (error) {
      console.log('Auto Connect failed', error);
      return false;
    }
  }

  async saveConnection(
    connection: CreateConnection,
    setAsDefault: boolean = false,
  ): Promise<Connection> {

    // Check whether the DB connection is valid or not :
    const valid =  await this.isValid(connection);
    if(!valid)
    {
      throw new Error("Database Connection is Invalid , Please re-check the connection credentials !");
    }
    const validConnection = {
      ...connection,
      is_valid : true
    };

    const savedConnection = await this.repository.saveConnection(validConnection);

    if (setAsDefault) {
      await this.repository.setDefaultConnection(savedConnection.id!);
      this.defaultConnectionId = savedConnection.id!;
      console.log(`Set ${connection} as default connection`);
    }
    return savedConnection;
  }

  async getAllConnections(): Promise<Connection[]> {
    return await this.repository.getAllConnections();
  }

  async getConnection(id: number): Promise<Connection | undefined> {
    return this.repository.getConnection(id);
  }

  async getDefaultConnection(): Promise<Connection | undefined> {
    return await this.repository.getDefaultConnection();
  }

  async setDefaultConnection(id: number): Promise<void> {
    await this.repository.setDefaultConnection(id);
    this.defaultConnectionId = id;
    console.log(`Set Connection ${id} as default`);
  }

  async deleteConnection(id: number): Promise<void> {
    
      await this.repository.deleteConnection(id);

  }

  async connectToDatabase(id: number): Promise<any> {
    const connection = await this.repository.getConnection(id);
    if (!connection) {
      throw new Error(`Connection ${id} not found`);
    }

    if (this.activeConections.has(id)) {
      console.log(`Already Connected to ${id}`);

      return this.activeConections.get(id);
    }

    let connector: any;

    switch (connection.connector) {
      case 'postgres':
        connector = await this.PostgresConnector.connectFromSaved(connection);
        this.activeConections.set(id,connector);
        this.client = connector;
        // THE CLIENT WOULD BE RETURNED AND SAVED IN THE CONNECTION SERVICE PUBLIC VARIABLE = CLIENT SO CAN BE USED IN THE SQL AGENT
        break;

      // Other cases to be implemented

      default:
        throw new Error(`Unsupported connector ${connection.connector}`);
    }
    this.activeConections.set(id, connector);
    console.log(`Connected to ${connection.connector}`);

    return connector;
  }

  async disconnectConnection(id: number): Promise<void> {
    const connector = this.activeConections.get(id);

    await connector.disconnect();
    this.activeConections.delete(id);
    console.log(`${id} Disconnected Successfully !`);
  }

  getActiveConnection(id: number): any {
    return this.activeConections.get(id);
  }

  isConnectionActive(id: number): boolean {
    return this.activeConections.has(id);
  }

  getDefaultConnectionId(): number | null {
    return this.defaultConnectionId;
  }

  async hasConnections(): Promise<boolean> {
    return await this.repository.hasConnections();
  }

  async executeQuery (query : string){

    // Initializes the Client based on the Provider Id & then accordingly executes the Query

    if (!this.client) {
      throw new Error('No active database connection. Please connect to a database first.');
    }

    try{
      const result = await this.client.query(query);
      return result?.rows || [];
    }
    catch(error){
      throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : String(error)}`);
    }

  }

  async testConnection(connection : CreateConnection) : Promise<boolean>
  {
    const valid =  await this.isValid(connection);
    return valid?true : false;
  }

  private async isValid(connection : CreateConnection) : Promise<boolean>
  {
    let isvalid : any;
    switch(connection.connector)
    {
      case ('postgres') : 
        isvalid = await this.PostgresConnector.checkConnectionValidity(connection);
        break;

      default:
        throw new Error(`Unsupported connector ${connection.connector}`);
    }

    return isvalid?true : false;

  }
}
