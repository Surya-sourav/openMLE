import type { ConnectionCredentials } from '../connectioncredentials.interface.js';

export interface CreateConnection {
  connector: string;
  type: 'credentials' | 'url';
  creds: ConnectionCredentials;
  is_default?: boolean;
  is_valid?:boolean;
}
