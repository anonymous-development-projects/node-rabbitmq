export class AmqpError extends Error {
  constructor(public readonly message: string, public code: number, public name = 'AmqpError') {
    super(message);
    this.code = code;
  }
}

export class RpcError extends Error {
  constructor(public readonly message: string, public code: number, public name = 'RpcError') {
    super(message);
    this.code = code;
  }
}
