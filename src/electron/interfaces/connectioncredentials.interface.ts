export interface UrlCredentials {
  url: string;
}

export interface DatabaseCredentials {
  host: string;
  database: string;
  user: string;
  password: string;
  sslmode?: string;
  channelbinding?: string;
  port?: number;
}

export type ConnectionCredentials = UrlCredentials | DatabaseCredentials;
