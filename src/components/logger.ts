export abstract class Logger {
  constructor(context?: string) {
    this.context = context || '';
  }

  private context = '';

  abstract log(message: unknown, context?: string): void;

  abstract debug(message: unknown, context?: string): void;

  abstract warn(message: unknown, context?: string): void;

  abstract error(message: unknown, context?: string, trace?: unknown): void;

  abstract fatal(message: unknown, context?: string, trace?: unknown): void;

  public setContext(context: string): void {
    this.context = context;
  }

  public getContext(): string {
    return this.context || '';
  }
}

export class DefaultLogger extends Logger {
  debug(message: unknown, context?: string): void {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(context || this.getContext(), `[DEBUG] ${message}`);
    }
  }

  error(message: unknown, context?: string, trace?: unknown): void {
    // eslint-disable-next-line no-console
    console.error(context || this.getContext(), `[ERROR] ${message}`, trace || '');
  }

  fatal(message: unknown, context?: string, trace?: unknown): void {
    // eslint-disable-next-line no-console
    console.error(context || this.getContext(), `[FATAL] ${message}`, trace || '');
  }

  log(message: unknown, context?: string): void {
    // eslint-disable-next-line no-console
    console.log(context || this.getContext(), `[INFO] ${message}`);
  }

  warn(message: unknown, context?: string): void {
    // eslint-disable-next-line no-console
    console.warn(context || this.getContext(), `[WARN] ${message}`);
  }
}
