/**
 * classes implements decorator for message from Rpc
 *
 */
import { IErrorResponse, IResponseObject } from '../interfaces/common';

export class RpcResponse {
  constructor(
    responseObject: IResponseObject,
    private readonly code = responseObject.code,
    private readonly data = responseObject.result,
    private readonly error?: IErrorResponse | Error,
  ) {
    if (responseObject.error && !(responseObject.error instanceof Error)) {
      this.error = responseObject.error;
    }
  }

  public isSuccess(): boolean {
    return this.getCode() === 200;
  }

  public getCode(): number {
    return this.code ? this.code : 500;
  }

  public getResponseData(): unknown {
    return this.data;
  }

  public getError(): IErrorResponse | undefined | Error {
    return this.error;
  }

  public getErrorMessage(): string | null {
    return this.error ? this.error.message : null;
  }
}
