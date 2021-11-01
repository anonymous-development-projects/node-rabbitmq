# Node RabbitMQ

Класс реализует работу с rabbitmq через конфиг amqp-config. В основе лежит
библиотека [amqplib](https://github.com/squaremo/amqp.node)

Документация: **Russian** | [English](./README.md)

## Runbook

### Установка

```bash
npm i @anonymous-development-projects/node-rabbitmq
```

### Создание экземпляра класса библиотеки:

```typescript
import {NodeRabbit} from '@anonymous-development-projects/node-rabbitmq';

//...

const nodeRabbit = new NodeRabbit(connectConfig, pathToConfig, queueList, logger);
await nodeRabbit.connect(async (error) => {
    // error handler
});
nodeRabbit.sendMessageToQueue('queueName', {some: 'data'});
//...
```            

### Параметры конструктора:

`connectConfig` - объект с конфигурацией соединения с RabbitMQ

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

`pathToConfig` - строка, путь к файлу конфигурации `amqp-config`

`queueList` - список очередей необходимых для работы

```typescript  
interface IQueues {
  consume?: string[];
  publish?: string[];
  rpc?: string[];
}
``` 

## Доступные методы

1. `connect(): Promise<amqp.Connection>` - вызывается в самом начале для подключения к рэббиту

2. `sendMessageToQueue(queueName: string, data: object, options?: amqplib.Publish): boolean`
    - `queueName` - имя очереди из конфига push-world по названию которой будет определен exchange и routing-key для
      отправки данных.
    - `data` - объект данных отсылаемый в очередь.
    - `options` - объект опций (необязательный параметр) amqplib.Publish, мерджится с опциями указанными в конфиги, если
      опции дублируются то их перетирает.

3. `sendMessageToQueueRPC(queueName: string, data: string, options?: amqplib.Publish): boolean` - отправляет сообщение в
   указанную очередь для RPC.

4. `consumeMessage(queueName: string, options?: amqplib.Consume, callback: (msg: amqplib.ConsumeMessage) => void):
   Promise<amqp.Replies.Consume>`
    - `queueName` - название очереди для получения сообщений.
    - `callback` - метод срабатывающий при получении сообщений.
    - `options` - Consume опции библиотеки amqplib поведение аналогично пункту 2.3.

5. `consumeMessageWithDataHandler(queueName: string, dataHandler: IDataHandler, options?: amqplib.Options.Consume):
   Promise<amqp.Replies.Consume>` - получение и обработка сообщений из очереди c базовой реализацией парсинга контента
   сообщений, логирование ошибок и подтверждение обработки сообщения.
    - `queueName` - название очереди.
    - `dataHandler`
   ```typescript
      interface IDataHandler {
      handle(content: object): Promise<{ result: unknown; error: Error | null }>;
   }
   ```
    - `options` - Consume опции библиотеки amqplib.

6. `rpcConsumeMessageWithDataHandler(queueName: string, dataHandler: IDataHandler, options?: amqplib.Consume): Promise<
   amqp.Replies.Consume>` - обработка rpc запросов c базовой реализацией валидацией сообщения, парсинга(сериализации)
   контента сообщения, логирование ошибок и подтверждение обработки сообщения и ответа по rpc.

7. `getResultFromRpc(queueName: sring, data: object, dataHandler: IDataHandler): Promise<unknown>` - запрос по rpc к
   сервису и обработка полученного ответа.

8. `close(): Promise<void>` - закрытие всех каналов.

9. `closeChannelByQueueName(queueName: string): Promise<void>` - закрытие конкретного канала по названию очереди.

## Тестирование

```bash
npm run test
```

Так же в библиотеке имеется Docker Compose для поднятия node и rabbitmq для проведения тестов.

