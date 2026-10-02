import { useState, type ReactNode } from 'react';
import { Field, Popover, TextInput } from '../../../form/index.js';

/**
 * Compact token creation action shared by each token CRUD adapter.
 *
 * The visible path field stays in the popover so the toolbar remains compact.
 */
export function TokenAddAction({
  label,
  actionName,
  inputName,
  initialPath,
  inputLabel = 'Path',
  placeholder,
  onAdd,
  fields,
  resetOnAdd = true,
}: {
  label: string;
  actionName: string;
  inputName: string;
  initialPath: string;
  inputLabel?: string;
  placeholder: string;
  onAdd: (path: string) => string | true | false;
  fields?: ReactNode;
  /** When false, keep the input value after a successful add (design-token path suggestion). */
  resetOnAdd?: boolean;
}) {
  const [path, setPath] = useState(initialPath);
  const [open, setOpen] = useState(false);

  function submit() {
    const result = onAdd(path);
    if (result !== false) {
      if (resetOnAdd) setPath(result === true ? '' : typeof result === 'string' ? result : '');
      else setPath(result === true ? path : typeof result === 'string' ? result : path);
      setOpen(false);
    }
  }

  return (
    <div className="token-add-action">
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button
            type="button"
            className="eu-icon-button"
            name={actionName}
            aria-label={label}
            title={label}
          >
            +
          </button>
        }
      >
        <div className="token-add-popover">
          {fields}
          <Field label={inputLabel}>
            <TextInput
              name={inputName}
              aria-label={inputLabel}
              value={path}
              placeholder={placeholder}
              onChange={setPath}
              onCommit={setPath}
            />
          </Field>
          <div className="token-add-popover-actions">
            <button type="button" className="text-button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="eu-button eu-button--primary"
              name={`${actionName}-submit`}
              onClick={submit}
            >
              Add
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
}
