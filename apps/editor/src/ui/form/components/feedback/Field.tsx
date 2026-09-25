import type { ReactNode } from 'react';
import { InlineError } from './InlineError.js';
import { HelpHint } from './HelpHint.js';
import { Inline } from '../layout/Inline.js';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const errorId = error ? `${htmlFor ?? label}-error` : undefined;
  return (
    <div className="eu-field">
      {label ? (
        <Inline gap={6}>
          <label className="eu-field__label" htmlFor={htmlFor}>
            {label}
            {required ? ' *' : ''}
          </label>
          {hint && !error ? <HelpHint text={hint} /> : null}
        </Inline>
      ) : null}
      {children}
      {hint && !label ? <span className="eu-field__hint">{hint}</span> : null}
      {error ? <InlineError id={errorId}>{error}</InlineError> : null}
    </div>
  );
}
