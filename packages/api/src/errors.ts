export type DomainErrorCode =
  'invalid-input' | 'unauthenticated' | 'forbidden' | 'not-found' | 'conflict';

/** Application failure; hosting adapters choose how to present it. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
