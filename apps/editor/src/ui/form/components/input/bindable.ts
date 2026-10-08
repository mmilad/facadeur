import { useId } from 'react';
import { getPath, resolvePath } from '../../schema/path.js';
import { useOptionalFormContext, usePathPrefix } from '../../FormContext.js';

type BindableProps<T> = {
  name?: string;
  value?: T;
  disabled?: boolean;
  invalid?: boolean;
  onChange?: (value: T) => void;
  onCommit?: (value: T) => void;
};

export function useBindable<T>(props: BindableProps<T>, fallback: T) {
  const form = useOptionalFormContext();
  const prefix = usePathPrefix();
  const generatedId = useId();
  const path = props.name ? resolvePath(prefix, props.name) : '';
  const bound = form && props.name !== undefined;

  const value = bound ? ((getPath(form.value, path) as T) ?? fallback) : (props.value ?? fallback);
  const disabled = (bound ? form.disabled : false) || props.disabled || false;
  const invalid = props.invalid ?? false;
  const id = bound ? `${generatedId}-${props.name}` : generatedId;

  const patchBound = (next: T) => {
    form!.emitChange(path, next);
  };

  const onLiveChange = (next: T) => {
    if (bound) patchBound(next);
    else props.onChange?.(next);
  };

  const onImmediateChange = (next: T) => {
    if (bound) patchBound(next);
    else {
      props.onChange?.(next);
      props.onCommit?.(next);
    }
  };

  const onCommitValue = (next: T) => {
    if (bound) patchBound(next);
    else if (props.onCommit) props.onCommit(next);
    else props.onChange?.(next);
  };

  return { value, disabled, invalid, onLiveChange, onImmediateChange, onCommitValue, id };
}
