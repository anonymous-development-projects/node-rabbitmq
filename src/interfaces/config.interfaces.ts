export interface IEvent {
  exchange: string;
  'routing-key': string;
}

export interface IRpcQueue {
  exchange: string;
  'routing-key': string;
}

export interface IExchange {
  type: string;
  delay: boolean;
}

export interface IAmqpConfig {
  events: Record<string, IEvent>;
  queues: Record<string, string[]>;
  rpc: Record<string, IRpcQueue>;
  exchanges: Record<string, IExchange>;
}

export interface IParsedExchangeConfig {
  name: string;
  type: string;
  isDelayed: boolean;
}

export interface IParsedEventConfig {
  name: string;
  routingKey: string;
  exchange: IParsedExchangeConfig;
}

export interface IParsedQueueConfig {
  name: string;
  listenEvents: IParsedEventConfig[];
}

export interface IParsedRpcQueueConfig {
  name: string;
  routingKey: string;
  exchange: IParsedExchangeConfig;
}
