import { existsSync, readFileSync } from 'fs';
import {
  IAmqpConfig,
  IParsedEventConfig,
  IParsedExchangeConfig,
  IParsedQueueConfig,
  IParsedRpcQueueConfig,
} from '../interfaces/config.interfaces';

export class AmqpConfig {
  constructor(private readonly path: string) {
    this.configArray = JSON.parse(this.getAmqpConfigFile(this.path));
  }

  protected configArray: IAmqpConfig;

  private getAmqpConfigFile(path: string): string {
    if (!existsSync(path)) {
      throw new Error('Config file not exists');
    }

    return readFileSync(path).toString();
  }

  public toArray(): IAmqpConfig {
    return this.configArray;
  }

  public getExchangeSettings(exchangeName: string): IParsedExchangeConfig {
    const config = this.toArray();
    if (!config.exchanges[exchangeName]) {
      throw new Error(`Exchange with name ${exchangeName} doesn\\'t exists in configuration file.`);
    }

    return {
      name: exchangeName,
      type: config.exchanges[exchangeName].type,
      isDelayed: config.exchanges[exchangeName].delay,
    };
  }

  public getEventSettings(eventName: string): IParsedEventConfig {
    const config = this.toArray();
    if (!config.events[eventName]) {
      throw new Error(`Event with name ${eventName} doesn\\'t exists in configuration file.`);
    }

    return {
      name: eventName,
      routingKey: config.events[eventName]['routing-key'],
      exchange: this.getExchangeSettings(config.events[eventName].exchange),
    };
  }

  public getQueueSettings(queueName: string): IParsedQueueConfig {
    const config = this.toArray();
    if (!config.queues[queueName]) {
      throw new Error(`Queue with name ${queueName} doesn\\'t exists in configuration file.`);
    }

    const events: IParsedEventConfig[] = [];
    config.queues[queueName].forEach((eventName) => {
      events.push(this.getEventSettings(eventName));
    });

    return {
      name: queueName,
      listenEvents: events,
    };
  }

  public getRpcQueueSettings(queueName: string): IParsedRpcQueueConfig {
    const config = this.toArray();
    if (!config.rpc[queueName]) {
      throw new Error(`RPC Queue with name ${queueName} doesn\\'t exists in configuration file.`);
    }

    return {
      name: queueName,
      routingKey: config.rpc[queueName]['routing-key'],
      exchange: {
        name: config.rpc[queueName].exchange,
        isDelayed: false,
        type: 'direct',
      },
    };
  }
}
