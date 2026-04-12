// Connect to the PG DB using the Connection String & the Credentials !
import { Pool , PoolConfig } from 'pg';
import { Connection } from '../internal-database/repositories/connection.repository.js';
import { DatabaseCredentials } from '../interfaces/connectioncredentials.interface.js';
import { CreateConnection } from '../interfaces/requests/create-connection.request.js';

export class PostgresConnector {
  private pool: Pool | null = null;
  private connectionInfo: Connection | null = null;

  async connectFromSaved(connection: Connection): Promise<Pool> {
    // Check if the Connection type is URl or Credentials !
    let credsData: any;
    try {
      if (typeof connection.creds === 'string') {
        credsData = JSON.parse(connection.creds);
      } else {
        credsData = connection.creds;
      }

      if (connection.type === 'url') {
        const urlstring = credsData.url;
        await this.connectViaConnectionURL(urlstring);
        this.connectionInfo = connection;
      } else if (connection.type === 'credentials') {
        const creds = {
          user: credsData.user,
          password: credsData.password,
          host: credsData.host,
          port: parseInt(credsData.port || '5432'),
          database: credsData.database,
          sslmode: credsData.sslmode,
        };

        console.log(`🔐 Connecting via credentials to ${creds.host}/${creds.database}...`);

        await this.connectViaCredentials(creds);

        this.connectionInfo = connection;
        console.log(`Successfully Connected to the ${connection.connector}`);
      } else {
        throw new Error(`Unsupported Connection Type`);
      }

      // Return Pool so it can be saved in the Connection Service , and can be used else where !
      return this.pool!;

    } catch (error) {
      console.error('Connection Failed !');
      throw error;
    }
  }

  async connectViaCredentials(creds: DatabaseCredentials): Promise<void> {
    try {
      const config: PoolConfig = {
        user: creds.user,
        password: creds.password,
        host: creds.host,
        port: creds.port,
        database: creds.database,
        ssl: creds.sslmode === 'require' ? { rejectUnauthorized: false } : undefined,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };
      this.pool = new Pool(config);

      const client = await this.pool.connect();
      console.log('Postgres Connected');
      client.release();
    } catch (error) {
      console.log('Postgres Connection Failed');
      throw error;
    }
  }

  async connectViaConnectionURL(url: string): Promise<void> {
    try {
      this.pool = new Pool({
        connectionString: url,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      const client = await this.pool.connect();
      console.log('Postgress Connected Successfully via URL !');
      client.release();
    } catch (error) {
      console.log('Postgres Connection Failed', error);
      throw error;
    }
  }

  
  getPool() : Pool | null {
    return this.pool;
  }

  async checkConnectionValidity(connection : CreateConnection) : Promise<Boolean> {
    let tempPool : Pool | null = null;
  
  try {
    let credsData : any;
     if (typeof connection.creds === 'string') {
        credsData = JSON.parse(connection.creds);
      } else {
        credsData = connection.creds;
      } 

       if (connection.type === 'url') {
        tempPool = new Pool({
          connectionString : credsData.url,
          max : 1,
          idleTimeoutMillis : 5000,
          connectionTimeoutMillis : 5000,
        });
      } else if (connection.type === 'credentials') {
        tempPool = new Pool({
          user: credsData.user,
          password: credsData.password,
          host: credsData.host,
          port: parseInt(credsData.port || '5432'),
          database: credsData.database,
          ssl: credsData.sslmode === 'require' ? { rejectUnauthorized: false } : undefined,
          max: 1,
          idleTimeoutMillis: 5000,
          connectionTimeoutMillis: 5000,
        });
      } else{ 
        return false;
      }

      const client = await tempPool.connect();
      client.release();
      await tempPool.end();
      return true;
    }
    catch(error)
    {
    console.error('Connection validation failed:', error);
    if (tempPool) {
      await tempPool.end().catch(() => {});
    }
    return false;
    }
  }
}