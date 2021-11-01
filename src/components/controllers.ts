import * as amqp from 'amqplib';
import { IDataHandler, IResultToReply } from '../interfaces/common';
import { RpcError } from './errors';
import { delay } from './helper';
import { ConsumeMsg, RpcConsumeMsg, RpcGetResultMsg } from '../schemas/validation';
import { Channel } from './channel';
import { RpcResponse } from './rpcResponse';
import { Logger } from './logger';

abstract class IncomingMessageControllerAbstract {
  constructor(
    public readonly channel: Channel,
    public readonly dataHandler: IDataHandler,
    private readonly log: Logger,
  ) {
    this.onMessage = this.onMessage.bind(this);
    this.log.setContext('IncomingMessageController');
  }

  abstract validateMsg(msg: amqp.ConsumeMessage): Error | null;

  public async onMessage(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg) {
      return;
    }
    try {
      const validationError = this.validateMsg(msg);
      if (validationError) {
        validationError.message = `received invalid message: ${validationError.message}`;
        this.channel.ch.ack(msg);
        return;
      }

      const stringContent = msg.content.toString();
      let parsedContent;
      try {
        parsedContent = JSON.parse(stringContent);
      } catch (error) {
        if (error instanceof Error) {
          error.message = `error json parse message content: ${error.message}`;
          this.log.error(error);
          return;
        }
        this.confirmHandledMsg(msg, { error, result: null });
        return;
      }

      const handleResult = await this.dataHandler.handle(parsedContent);

      if (handleResult.error && handleResult.error.message) {
        handleResult.error.message = `error handle message content: ${handleResult.error.message}`;
        if (!(handleResult.error instanceof RpcError)) {
          this.log.error(handleResult.error);
        }
      }
      this.confirmHandledMsg(msg, handleResult);
    } catch (error) {
      if (error instanceof Error) {
        error.message = `fatal error: ${error.message}`;
      }
      this.log.fatal(error);
      await delay(5000);
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
  }

  abstract confirmHandledMsg(msg: amqp.ConsumeMessage, result: unknown): void;
}

export class ConsumeController extends IncomingMessageControllerAbstract {
  validateMsg(msg: amqp.Message): Error | null {
    const result = ConsumeMsg.validate(msg);
    if (result.error) {
      return result.error;
    }
    return null;
  }

  confirmHandledMsg(msg: amqp.Message): void {
    this.channel.ch.ack(msg);
  }
}

export class RpcConsumeController extends IncomingMessageControllerAbstract {
  public validateMsg(msg: amqp.Message): Error | null {
    const result = RpcConsumeMsg.validate(msg);
    if (result.error) {
      return result.error;
    }
    return null;
  }

  public confirmHandledMsg(msg: amqp.Message, result: { error: Error | RpcError | null; result: unknown }): void {
    const rpcResponse = this.prepareResultToReply(result);

    this.channel.sendMessageToQueueRPC(msg.properties.replyTo, rpcResponse, {
      correlationId: msg.properties.correlationId,
    });
    this.channel.ch.ack(msg);
  }

  private prepareResultToReply(res: { error: Error | RpcError | null; result: unknown }): IResultToReply {
    if (!res.error) {
      return {
        status: 200,
        response: res.result,
      };
    }

    if (res.error instanceof RpcError) {
      return {
        status: res.error.code,
        response: res.result,
        error: {
          message: res.error.message,
          code: res.error.code,
          info: null,
        },
      };
    }

    return {
      status: 500,
      response: res.result,
      error: {
        message: res.error.message,
        code: 0,
        info: null,
      },
    };
  }
}

export class RpcGetResultController {
  constructor(
    private readonly channel: amqp.Channel,
    private readonly dataHandler: IDataHandler,
    private readonly log: Logger,
  ) {
    this.onMessage = this.onMessage.bind(this);
    this.log.setContext('RpcGetResultController');
  }

  private validateMsg(msg: amqp.ConsumeMessage) {
    const result = RpcGetResultMsg.validate(msg);
    if (result.error) {
      return result.error;
    }
    return null;
  }

  private confirmHandledMsg(msg: amqp.ConsumeMessage): void {
    this.channel.ack(msg);
  }

  public async onMessage(msg: amqp.ConsumeMessage | null): Promise<RpcResponse | void> {
    if (!msg) {
      return;
    }
    try {
      const validationError = this.validateMsg(msg);
      if (validationError) {
        validationError.message = `received invalid message: ${validationError.message}`;
        this.confirmHandledMsg(msg);
        return;
      }

      const stringContent = msg.content.toString();
      let parsedContent;
      try {
        parsedContent = JSON.parse(stringContent);
      } catch (error) {
        if (error instanceof Error) {
          error.message = `error json parse message content: ${error.message}`;
          this.log.error(error);
          return;
        }
        this.confirmHandledMsg(msg);
        return;
      }

      const handleResult = await this.dataHandler.handle(parsedContent);

      if (handleResult.error && handleResult.error.message) {
        handleResult.error.message = `error handle message content: ${handleResult.error.message}`;
        if (!(handleResult.error instanceof RpcError) && process.env.NODE_ENV !== 'test') {
          this.log.error(handleResult.error);
        }
      }

      this.confirmHandledMsg(msg);
      // eslint-disable-next-line consistent-return
      return new RpcResponse(handleResult);
    } catch (error) {
      if (error instanceof Error) {
        error.message = `fatal error: ${error.message}`;
      }

      this.log.fatal(error);
      await delay(5000);
      // eslint-disable-next-line unicorn/no-process-exit
      // process.exit(1);
    }
  }
}
