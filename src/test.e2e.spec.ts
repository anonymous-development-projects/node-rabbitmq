import * as dotenv from 'dotenv';
import { join } from 'path';
import { NodeRabbit } from './main';
import { RpcResponse } from './components/rpcResponse';

describe('NodeRabbit', () => {
  let nodeRabbit: NodeRabbit;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});

    dotenv.config({
      path: join(process.cwd(), 'envs', 'test.env'),
    });

    const port =
      process.env.AMQP_PORT && !Number.isNaN(process.env.AMQP_PORT) ? Number.parseInt(process.env.AMQP_PORT, 10) : 5672;

    nodeRabbit = new NodeRabbit(
      {
        host: process.env.AMQP_HOST || 'localhost',
        password: process.env.AMQP_PASSWORD || 'guest',
        user: process.env.AMQP_USER || 'guest',
        port,
        heartbeat: 60,
      },
      process.env.PATH_TO_RABBITMQ_COFIG || `${process.cwd()}/test.config.json`,
      {
        publish: ['test', 'batch'],
        rpc: ['rpc.test', 'rpc.test.reply'],
        consume: ['test', 'test.datahandler', 'batch'],
      },
    );
  });

  it('connect', async () => {
    await nodeRabbit.connect(async (error) => {
      nodeRabbit.logger?.error(error, 'test connect');
    });
    expect(nodeRabbit.connectionState).toBe(true);
  });

  it('sendMessageToQueue', async () => {
    const result = nodeRabbit.sendMessageToQueue('test', { test: 'message' });
    nodeRabbit.sendMessageToQueue('test', { test: 'message' });
    expect(result).toBe(true);
  });

  it('sendMessageToQueueRPC', async () => {
    const result = nodeRabbit.sendMessageToQueueRPC(
      'rpc.test',
      { test: 'rpc' },
      {
        replyTo: 'rpc.test.reply',
        correlationId: 'test.correlation.id',
      },
    );
    expect(result).toBe(true);
  });

  it('consumeMessage', async () => {
    let data;
    await nodeRabbit.consumeMessage('test', async (msg) => {
      if (msg === null) {
        throw new Error('no message from query');
      }

      data = JSON.parse(msg.content?.toString());
      const channel = nodeRabbit.getChannelByQueueName('test');
      channel.ch.ack(msg);
    });
    expect(data).toEqual({ test: 'message' });
  });

  it('consumeMessageWithDatahandler', async () => {
    nodeRabbit.sendMessageToQueue('test.datahandler', { test: 'message' });

    let c: unknown;

    await nodeRabbit.consumeMessageWithDatahandler('test.datahandler', {
      async handle(content: unknown): Promise<{ result: unknown; error: Error | null }> {
        c = content;
        return {
          result: 'test',
          error: null,
        };
      },
    });

    expect(c).toEqual({ test: 'message' });
  });

  it('rpcConsumeMessageWithDatahandler', async () => {
    let c: unknown;
    await nodeRabbit.rpcConsumeMessageWithDatahandler('rpc.test', {
      async handle(content: unknown): Promise<{ result: unknown; error: Error | null }> {
        c = content;
        return {
          result: 'test',
          error: null,
        };
      },
    });

    expect(c).toEqual({ test: 'rpc' });
  });

  it('getResultFromRpc', async () => {
    const result: RpcResponse = <RpcResponse>await nodeRabbit.getResultFromRpc(
      'rpc.test.reply',
      {
        correlation_id: 'test.correlation.id',
      },
      {
        async handle(): Promise<{ result: unknown; error: Error | null; code: number }> {
          return {
            result: 'test',
            error: null,
            code: 200,
          };
        },
      },
    );

    expect(result).toBeInstanceOf(RpcResponse);
    expect(result.isSuccess()).toEqual(true);
  });

  it('getResultFromRpc with error', async () => {
    const result: RpcResponse = <RpcResponse>await nodeRabbit.getResultFromRpc(
      'rpc.test.reply',
      {
        correlation_id: 'test.correlation.id',
      },
      {
        async handle(): Promise<{ result: unknown; error: Error | null; code: number }> {
          return {
            result: 'test',
            error: new Error('some error'),
            code: 500,
          };
        },
      },
    );

    expect(result).toBeInstanceOf(RpcResponse);
    expect(result.isSuccess()).toEqual(false);
  });

  it('batch consume', async () => {
    await nodeRabbit.batchConsume(
      'batch',
      async (messages) => {
        expect(messages).toHaveLength(2);
        messages.forEach((msg, i) => {
          expect(JSON.parse(msg.content.toString())).toEqual({ test: i + 1 });
        });
      },
      {},
      2,
    );

    nodeRabbit.sendMessageToQueue('batch', { test: 1 });
    nodeRabbit.sendMessageToQueue('batch', { test: 2 });
  });

  afterAll(async () => {
    await nodeRabbit.close();
    // await new Promise((resolve) => setTimeout(() => resolve(1), 500)); // avoid jest open handle error
  });
});
