import * as amqp from 'amqplib';
import { IConnectOptions, IDataHandler, IQueues } from './interfaces/common';
import { Channel } from './components/channel';
import { AmqpConfig } from './components/config';
import { DefaultLogger, Logger } from './components/logger';

export class NodeRabbit {
  constructor(
    private readonly connectConfig: IConnectOptions,
    private readonly pathToConfig: string,
    private readonly queueList?: IQueues,
    public readonly logger?: Logger,
    private amqpConfig?: AmqpConfig,
    private queueNamesToConsumeTag: Record<string, string> = {},
    private queueNamesToChannels: Record<string, Channel> = {},
  ) {
    if (!this.connectConfig.heartbeat) {
      this.connectConfig.heartbeat = 60;
    }

    if (!this.logger) {
      this.logger = new DefaultLogger();
    }

    this.readConfig();
  }

  private conn: amqp.Connection | undefined;

  public connectionState = false;

  private readConfig() {
    this.amqpConfig = new AmqpConfig(this.pathToConfig);
  }

  public get connection(): amqp.Connection | null {
    return this.conn || null;
  }

  public async connect(errorHandler: (error: Error) => void): Promise<void> {
    const optionsParams = Object.entries(this.connectConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    this.conn = await amqp.connect(
      `amqp://${this.connectConfig.user}:${encodeURIComponent(this.connectConfig.password)}@${
        this.connectConfig.host
      }:${this.connectConfig.port}?${optionsParams}`,
    );

    const connectionHandler = typeof errorHandler === 'function' ? errorHandler : NodeRabbit.errorHandler;

    this.conn.on('error', connectionHandler);

    await this.initChannelsToQueues(this.queueList);
    this.connectionState = true;
  }

  async initChannelsToQueues(queueList?: IQueues): Promise<void> {
    if (!queueList) {
      return;
    }

    if (queueList.publish && queueList.publish.length > 0) {
      await queueList.publish.reduce(async (accumulator, queueName) => {
        await accumulator;
        const channel = await this.initChannelToQueue(queueName);
        await channel.assertExchangeForPublish(queueName);
      }, Promise.resolve());
    }

    if (queueList.consume && queueList.consume.length > 0) {
      await queueList.consume.reduce(async (accumulator, queueName) => {
        await accumulator;
        const channel = await this.initChannelToQueue(queueName);
        await channel.assertQueueForConsume(queueName);
      }, Promise.resolve());
    }

    if (queueList.rpc && queueList.rpc.length > 0) {
      await queueList.rpc.reduce(async (accumulator, queueName) => {
        await accumulator;
        const channel = await this.initChannelToQueue(queueName);
        await channel.assertQueueForRpc(queueName);
      }, Promise.resolve());
    }
  }

  private async initChannelToQueue(queueName: string): Promise<Channel> {
    this.amqpConfig?.getQueueSettings(queueName);
    this.queueNamesToChannels[queueName] = await this.createChannel();
    return this.queueNamesToChannels[queueName];
  }

  private async createChannel(): Promise<Channel> {
    if (!this.conn) {
      throw new Error('Unable to get RabbitMQ connection');
    }
    const ch = await this.conn.createChannel();
    await ch.prefetch(1);
    return new Channel(ch, <AmqpConfig>this.amqpConfig, <Logger>this.logger);
  }

  public sendMessageToQueue(queueName: string, data: unknown, options: amqp.Options.Publish = {}): boolean {
    const ch = this.getChannelByQueueName(queueName);
    return ch.publishMessage(queueName, data, options);
  }

  public sendMessageToQueueRPC(queueName: string, data: unknown, options: amqp.Options.Publish = {}): boolean {
    const ch = this.getChannelByQueueName(queueName);
    return ch.sendMessageToQueueRPC(queueName, data, options);
  }

  public async consumeMessage(
    queueName: string,
    callback: (msg: amqp.ConsumeMessage | null) => void,
    options: amqp.Options.Consume = {},
  ): Promise<amqp.Replies.Consume> {
    const ch = this.getChannelByQueueName(queueName);
    const repliesConsume = await ch.consume(queueName, callback, options);
    this.queueNamesToConsumeTag[queueName] = repliesConsume.consumerTag;
    return repliesConsume;
  }

  public async batchConsume(
    queueName: string,
    callback: (msg: amqp.ConsumeMessage[]) => Promise<void>,
    options: amqp.Options.Consume = {},
    count = 100,
  ): Promise<unknown> {
    const channel = this.getChannelByQueueName(queueName);
    return channel.batchConsume(queueName, callback, options, count);
  }

  public async consumeMessageWithDatahandler(
    queueName: string,
    dataHandler: IDataHandler,
    options: amqp.Options.Consume = {},
  ): Promise<amqp.Replies.Consume> {
    const ch = this.getChannelByQueueName(queueName);
    const repliesConsume = await ch.consumeMessageWithDatahandler(queueName, dataHandler, options);
    this.queueNamesToConsumeTag[queueName] = repliesConsume.consumerTag;
    return repliesConsume;
  }

  public async rpcConsumeMessageWithDatahandler(
    queueName: string,
    dataHandler: IDataHandler,
    options: amqp.Options.Consume = {},
  ): Promise<amqp.Replies.Consume> {
    const ch = this.getChannelByQueueName(queueName);
    const repliesConsume = await ch.rpcConsumeMessageWithDatahandler(queueName, dataHandler, options);
    this.queueNamesToConsumeTag[queueName] = repliesConsume.consumerTag;
    return repliesConsume;
  }

  public async getResultFromRpc(queueName: string, data: unknown, dataHandler: IDataHandler): Promise<unknown> {
    const ch = this.getChannelByQueueName(queueName);
    return ch.getResultFromRpc(queueName, data, dataHandler);
  }

  public getChannelByQueueName(queueName: string): Channel {
    const ch = this.queueNamesToChannels[queueName];
    if (!ch) {
      throw new Error(`channel for queue ${queueName} not found`);
    }
    return ch;
  }

  static errorHandler(error: Error): void {
    // eslint-disable-next-line
    console.error(error);
    // eslint-disable-next-line
    process.exit(1);
  }

  public async close(): Promise<void> {
    await this.cancelAllConsumers();
    await this.closeAllChannels();
    this.connectionState = false;
    await this.connection?.close();
  }

  public async closeAllChannels(): Promise<void> {
    await Object.values(this.queueNamesToChannels).reduce(async (accumulator, channel) => {
      await accumulator;
      await channel.ch.close();
    }, Promise.resolve());
  }

  public async cancelAllConsumers(): Promise<void> {
    await Object.keys(this.queueNamesToConsumeTag).reduce(async (accumulator, queueName) => {
      await accumulator;
      const channel = this.getChannelByQueueName(queueName);
      await channel.ch.cancel(this.getConsumeTagByQueueName(queueName));
    }, Promise.resolve());
  }

  private getConsumeTagByQueueName(queueName: string): string {
    const tag = this.queueNamesToConsumeTag[queueName];
    if (!tag) {
      throw new Error(`consume tag for queue ${queueName} not found`);
    }
    return tag;
  }

  public async closeChannelByQueueName(queueName: string): Promise<void> {
    const channel = this.getChannelByQueueName(queueName);
    return channel.ch.close();
  }
}
