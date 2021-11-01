export interface IConnectOptions {
  host: string;
  user: string;
  password: string;
  port: number;
  maxReconnAttempts?: number;
  heartbeat?: number;
}
