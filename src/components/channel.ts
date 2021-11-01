import * as amqp from 'amqplib';
import { v1 as Uuid } from 'uuid';
import { IDataHandler } from '../interfaces/common';
import { ConsumeController, RpcConsumeController, RpcGetResultController } from './controllers';
import { AmqpConfig } from './config';
import { IParsedQueueConfig, IParsedRpcQueueConfig } from '../interfaces/config.interfaces';
import { Logger } from './logger';

export class Channel {
  constructor(public readonly ch: amqp.Channel, private readonly config: AmqpConfig, private readonly log: Logger) {
    this.log.setContext('Channel');
  }

  private batchConsumeQueue: amqp.ConsumeMessage[] = [];

  public publishMessage(queueName: string, data: unknown, options: amqp.Options.Publish): boolean {
    const info = this.config.getQueueSettings(queueName);

    if (!info) {
      this.log.error(`error get queue info ${queueName}`);
      return false;
    }

    let rs = true;

    info.listenEvents.forEach((event) => {
      const result = this.ch.publish(event.exchange.name, event.routingKey, Buffer.from(JSON.stringify(data)), {
        deliveryMode: 2,
        ...options,
      });

      if (result) {
        this.log.debug(`Message was published: ${event.exchange.name} ${event.routingKey}`);
      } else {
        rs = false;
        this.log.error(`error publish message content: ${event.exchange.name} ${event.routingKey}`);
      }
    });

    return rs;
  }

  public sendMessageToQueue(queueName: string, data: unknown, options: amqp.Options.Publish = {}): boolean {
    return this.ch.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), options);
  }

  public sendMessageToQueueRPC(queueName: string, data: unknown, options: amqp.Options.Publish = {}): boolean {
    return this.ch.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), options);
  }

  public async consumeMessageWithDatahandler(
    queueName: string,
    dataHandler: IDataHandler,
    options: amqp.Options.Consume = {},
  ): Promise<amqp.Replies.Consume> {
    const consumeController = new ConsumeController(this, dataHandler, this.log);
    return this.ch.consume(queueName, consumeController.onMessage, options);
  }

  public async rpcConsumeMessageWithDatahandler(
    queueName: string,
    dataHandler: IDataHandler,
    options: amqp.Options.Consume = {},
  ): Promise<amqp.Replies.Consume> {
    const rpcConsumeController = new RpcConsumeController(this, dataHandler, this.log);
    return this.ch.consume(queueName, rpcConsumeController.onMessage, options);
  }

  async getResultFromRpc(queueName: string, data: unknown, dataHandler?: IDataHandler): Promise<unknown> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        const q = await this.ch.assertQueue('', {
          durable: false,
          exclusive: true,
          autoDelete: false,

          // passive: false,
          // nowait: false,
        });
        const corr = Uuid();

        // default data handler instance
        if (!dataHandler) {
          dataHandler = {
            async handle(content) {
              return {
                result: content,
                error: null,
              };
            },
          };
        }

        const rpcGetResultController = new RpcGetResultController(this.ch, dataHandler, this.log);
        const { consumerTag } = await this.ch.consume(
          q.queue,
          async (msg) => {
            const result = rpcGetResultController.onMessage(msg);
            await this.ch.cancel(consumerTag);
            resolve(result);
          },
          { noAck: false },
        );

        this.sendMessageToQueueRPC(q.queue, data, {
          correlationId: corr,
          replyTo: q.queue,
          deliveryMode: 2,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async assertQueueForConsume(queueName: string): Promise<void> {
    const info = this.config.getQueueSettings(queueName);
    await this.assertQueue(queueName, info);
    this.log.log(`assert queue for consume: ${queueName}`);
  }

  public async assertQueueForRpc(queueName: string): Promise<void> {
    const info = this.config.getRpcQueueSettings(queueName);

    await this.assertRpcQueue(queueName, info);
    this.log.log(`assert queue for consume rpc: ${queueName}`);
  }

  public async assertExchangeForPublish(queueName: string): Promise<void> {
    const info = this.config.getQueueSettings(queueName);

    await info.listenEvents.reduce(async (accumulator, event) => {
      await accumulator;
      await this.ch.assertExchange(event.exchange.name, event.exchange.type, { durable: true });
      this.log.log(
        `assert exchange ${event.exchange.name} for publish to queue: ${queueName} with routing-key ${event.routingKey}`,
      );
    }, Promise.resolve());
  }

  private async assertQueue(queueName: string, info: IParsedQueueConfig) {
    await this.ch.assertQueue(queueName, { durable: true });
    await info.listenEvents.reduce(async (accumulator, event) => {
      await accumulator;
      await this.ch.assertExchange(event.exchange.name, event.exchange.type, { durable: true });
      await this.ch.bindQueue(queueName, event.exchange.name, event.routingKey);
    }, Promise.resolve());
  }

  private async assertRpcQueue(queueName: string, info: IParsedRpcQueueConfig) {
    await this.ch.assertQueue(queueName, { durable: true });
    await this.ch.assertExchange(info.exchange.name, info.exchange.type, { durable: true });
    await this.ch.bindQueue(queueName, info.exchange.name, info.routingKey);
  }

  public async consume(
    queueName: string,
    callback: (msg: amqp.ConsumeMessage | null) => void,
    options: amqp.Options.Consume,
  ): Promise<amqp.Replies.Consume> {
    return this.ch.consume(queueName, callback, options);
  }

  public async batchConsume(
    queueName: string,
    callback: (messages: amqp.ConsumeMessage[]) => Promise<void>,
    options: amqp.Options.Consume,
    count: number,
  ): Promise<void> {
    await this.ch.consume(
      queueName,
      async (msg) => {
        if (msg !== null) {
          this.batchConsumeQueue.push(msg);
          this.ch.ack(msg);
        }

        if (this.batchConsumeQueue.length >= count) {
          await callback(this.batchConsumeQueue);
          this.batchConsumeQueue = [];
        }
      },
      options,
    );
  }
}
