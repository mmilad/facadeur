import { useCallback } from 'react';
import { DEFAULT_DENSITY } from './const/index.js';
import { FormProvider } from './FormContext.js';
import { getPath, setPath } from './schema/path.js';
import type { FormChangeMeta, FormProps } from './types/form.js';
import './form.css';

export function Form<T extends object>({
  value,
  onChange,
  onCommit,
  disabled = false,
  density = DEFAULT_DENSITY,
  children,
}: FormProps<T>) {
  const emitChange = useCallback(
    (path: string, next: unknown, options?: { commit?: boolean }) => {
      const previous = getPath(value, path);
      if (Object.is(previous, next)) return;
      const nextValue = setPath(value, path, next);
      const meta: FormChangeMeta = { path, previous, next };
      onChange(nextValue, meta);
      if (options?.commit && onCommit) onCommit(nextValue, meta);
    },
    [value, onChange, onCommit],
  );

  const densityClass = density === 'comfortable' ? 'eu-form--comfortable' : '';

  return (
    <div className={`eu-form ${densityClass}`.trim()} data-density={density}>
      <FormProvider value={value} disabled={disabled} density={density} emitChange={emitChange}>
        {children}
      </FormProvider>
    </div>
  );
}
