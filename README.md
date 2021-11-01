# Node RabbitMQ

Package for using RabbitMQ in Node.js. Based on [amqplib](https://github.com/squaremo/amqp.node)

Documentation: [Russian](./README.RU.md) | **English**

## Runbook

### Install

```bash
npm i @anonymous-development-projects/node-rabbitmq
```

### Usage

```typescript
import { NodeRabbit } from '@anonymous-development-projects/node-rabbitmq';

//...

const nodeRabbit = new NodeRabbit(connectConfig, pathToConfig, queueList, logger);
await nodeRabbit.connect(async (error) => {
    // error handler
});
nodeRabbit.sendMessageToQueue('queueName', {some: 'data'});
//...
```            

### Constructor options

`connectConfig` - connection RabbitMQ config

```typescript
interface IConnectOptions {
    host: string;
    user: string;
    password: string;
    port: number;
    maxReconnAttempts?: number;
    heartbeat?: number;
}
```

`pathToConfig` - path to `amqp-config`

`queueList` - list of queues

```typescript  
interface IQueues {
  consume?: string[];
  publish?: string[];
  rpc?: string[];
}
``` 

## Methods

1. `connect(): Promise<amqp.Connection>` - called at the very beginning to connect to the RabbitMQ

2. `sendMessageToQueue(queueName: string, data: object, options?: amqplib.Publish): boolean`
    - `queueName` - the name of the queue from the config, by the name of which exchange and routing-key will be
      determined for sending data.
    - `data` - the data object for sending to the queue.
    - `options` - the options object (optional parameter) amqplib.Publish, merges with the options specified in the
      configs, if the options are duplicated then they are replaced.

3. `sendMessageToQueueRPC(queueName: string, data: string, options?: amqplib.Publish): boolean` - sends a message to the
   specified queue for RPC.

4. `consumeMessage(queueName: string, options?: amqplib.Consume, callback: (msg: amqplib.ConsumeMessage) => void):
   Promise<amqp.Replies.Consume>`
    - `queueName` - the name of the queue for receiving messages.
    - `callback` - the method that is triggered when receiving messages.
    - `options` - The Consume options of the amqplib library.

5. `consumeMessageWithDataHandler(queueName: string, dataHandler: IDataHandler, options?: amqplib.Options.Consume):
   Promise<amqp.Replies.Consume>` - receiving and processing messages from a queue with a basic implementation of
   content parsing messages, error logging and confirmation of message processing.
    - `queueName` - queue name.
    - `dataHandler`
   ```typescript
   interface IDataHandler {
     handle(content: object): Promise<{ result: unknown; error: Error | null }>;
   }
   ```
    - `options` - The Consume options of the amqplib library.

6. `rpcConsumeMessageWithDataHandler(queueName: string, dataHandler: IDataHandler, options?: amqplib.Consume): Promise<
   amqp.Replies.Consume>` - processing of rpc requests with the basic implementation of message validation, parsing (
   serialization)
   message content, error logging and confirmation of message processing and response by rpc.

7. `getResultFromRpc(queueName: sring, data: object, dataHandler: IDataHandler): Promise<unknown>` - rpc request to the
   service and processing of the received response.

8. `close(): Promise<void>` - closing all channels.

9. `closeChannelByQueueName(queueName: string): Promise<void>` - closing a specific channel by queue name.

## Tests

```bash
npm run test
```

The library also has a Docker Compose containing node and rabbitmq for tests.

