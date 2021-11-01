export interface IConnectOptions {
  host: string;
  user: string;
  password: string;
  port: number;
  maxReconnAttempts?: number;
  logger?: unknown;
  heartbeat?: number;
}

export interface IQueues {
  consume?: string[];
  publish?: string[];
  rpc?: string[];
}

export interface IExchangeAmqpConfig {
  type: string;
  delay: boolean;
}

export interface IQueueAmqpConfig {
  exchange: string;
  'routing-key': string;
}

export interface IAmqpConfig {
  exchange?: Record<string, IExchangeAmqpConfig>;
  queue?: Record<string, IQueueAmqpConfig>;
  rpc?: Record<string, IQueueAmqpConfig>;
  logger?: Record<string, IQueueAmqpConfig>;
}

export interface IConfigInfo {
  queue: IQueueAmqpConfig;
  exchange: IExchangeAmqpConfig;
}

export interface IDataHandler {
  // eslint-disable-next-line @typescript-eslint/ban-types
  handle(content: object): Promise<{ result: unknown; error: Error | null }>;
}

export interface IErrorResponse {
  message: string;
  code: number;
  info: unknown | null;
}

export interface IResultToReply {
  status: number;
  response: unknown;
  error?: IErrorResponse;
}

export interface IResponseObject {
  code?: number;
  result: unknown;
  error?: IErrorResponse | Error | null;
}
