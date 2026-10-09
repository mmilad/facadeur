import type { FieldValue } from './field-value';

export interface DomSpec {
  readonly tagName: string;
  /** Text content or a stable prop reference, separate from HTML attributes and DOM properties. */
  readonly text?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly data?: Readonly<Record<string, string>>;
  readonly properties?: Readonly<Record<string, FieldValue>>;
  readonly event?: Readonly<Record<string, unknown>>;
}
