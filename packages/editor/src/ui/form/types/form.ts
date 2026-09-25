export type FormDensity = 'compact' | 'comfortable';

export type FormChangeMeta = {
  path: string;
  previous: unknown;
  next: unknown;
};

import type { ReactNode } from 'react';

export type FormProps<T extends object> = {
  value: T;
  onChange: (next: T, meta: FormChangeMeta) => void;
  onCommit?: (next: T, meta: FormChangeMeta) => void;
  disabled?: boolean;
  density?: FormDensity;
  children: ReactNode;
};

export type FormContextValue<T extends object = object> = {
  value: T;
  disabled: boolean;
  density: FormDensity;
  pathPrefix: string;
  emitChange: (path: string, next: unknown, options?: { commit?: boolean }) => void;
  registerCommitHandler?: (path: string, handler: () => void) => () => void;
};

export type FieldBinding<T> = {
  value: T;
  disabled: boolean;
  id: string;
  'aria-invalid'?: boolean;
  onLiveChange: (next: T) => void;
  onImmediateChange: (next: T) => void;
  onCommitValue: (next: T) => void;
};
