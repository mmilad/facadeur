import type { ReactNode } from 'react';
import { PathPrefixProvider, useOptionalFormContext, usePathPrefix } from '../../FormContext.js';
import { getPath, resolvePath } from '../../schema/path.js';
import { IconButton } from '../shared/IconButton.js';
import { Stack } from '../layout/Stack.js';
import { Inline } from '../layout/Inline.js';

export type ArrayFieldHelpers<TItem> = {
  remove: () => void;
  index: number;
  item: TItem;
};

export function ArrayField<TItem>({
  name,
  value: valueProp,
  defaultItem,
  disabled,
  onChange,
  children,
}: {
  name?: string;
  value?: TItem[];
  defaultItem: TItem | (() => TItem);
  disabled?: boolean;
  onChange?: (value: TItem[]) => void;
  children: (item: TItem, index: number, helpers: ArrayFieldHelpers<TItem>) => ReactNode;
}) {
  const form = useOptionalFormContext();
  const prefix = usePathPrefix();
  const path = name ? resolvePath(prefix, name) : '';
  const bound = form && name;
  const items = bound ? ((getPath(form.value, path) as TItem[]) ?? []) : (valueProp ?? []);
  const isDisabled = disabled ?? form?.disabled ?? false;

  function emit(next: TItem[]) {
    if (bound) form.emitChange(path, next, { commit: true });
    else onChange?.(next);
  }

  function addItem() {
    const item = typeof defaultItem === 'function' ? (defaultItem as () => TItem)() : defaultItem;
    emit([...items, item]);
  }

  function removeAt(index: number) {
    emit(items.filter((_, i) => i !== index));
  }

  return (
    <Stack gap={8}>
      {items.map((item, index) => (
        <PathPrefixProvider key={index} prefix={name ? `${name}.${index}` : String(index)}>
          <div className="eu-array-row">
            <div className="eu-array-row__body">
              {children(item, index, { remove: () => removeAt(index), index, item })}
            </div>
            <IconButton label="Remove row" disabled={isDisabled} onClick={() => removeAt(index)}>
              ×
            </IconButton>
          </div>
        </PathPrefixProvider>
      ))}
      <Inline>
        <IconButton label="Add row" disabled={isDisabled} onClick={addItem}>
          +
        </IconButton>
      </Inline>
    </Stack>
  );
}
