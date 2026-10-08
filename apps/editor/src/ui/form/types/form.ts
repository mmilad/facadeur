/**
 * Editor form kit — data path patching (not JSON Schema authoring).
 *
 * Separation of concerns:
 * - `Form` owns the value object and is the only writer (`setPath` + `onChange`).
 * - Fields read via `name` + optional `PathPrefixProvider` row segments (`items.0.name`).
 * - Layout/feedback (`Field`, `Stack`, …) never mutate data.
 * - JSON Schema → field config lives in `ui/schema/json-schema-form-config.ts` and renders
 *   through this kit; schema documents stay plain JSON Schema in Core/domain.
 *
 * React note: text inputs keep a local draft while typing so the caret stays stable; each
 * keystroke still calls `emitChange`, so the parent updates on change, not on blur/submit.
 */

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
  /** @deprecated Prefer `onChange`; kept for legacy demos/tests. */
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
  /** Patch one path segment on the form value and notify `onChange`. */
  emitChange: (path: string, next: unknown) => void;
};

export type FieldBinding<T> = {
  value: T;
  disabled: boolean;
  id: string;
  'aria-invalid'?: boolean;
  /** Bound fields: patch on each update. Unbound: maps to `onChange`. */
  onLiveChange: (next: T) => void;
  /** @deprecated Alias of `onLiveChange` when bound; unbound still maps to change+commit. */
  onImmediateChange: (next: T) => void;
  /** Unbound: blur/submit; bound: same as `onLiveChange`. */
  onCommitValue: (next: T) => void;
};
