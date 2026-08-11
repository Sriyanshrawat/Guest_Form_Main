import { ErrorHandler, Injectable } from '@angular/core';

// Recovers from unhandled runtime errors so one thrown exception during fast
// navigation cannot freeze the whole application. The original error is still
// logged to the console so it can be diagnosed.
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const err = error as { message?: string; stack?: string; name?: string };
    console.error('[GlobalErrorHandler]', err?.name ?? 'Error', err?.message ?? error);
    console.error(err?.stack ?? '');
  }
}
