import type { FieldValue } from './field-value';

export interface DomSpec {
  readonly tagName: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly data?: Readonly<Record<string, string>>;
  readonly properties?: Readonly<Record<string, FieldValue>>;
  readonly event?: Readonly<Record<string, unknown>>;
}
