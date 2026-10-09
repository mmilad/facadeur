import { useState, type ReactNode } from 'react';
import { TextField } from '@facadeur/form';
import { Popover } from '../../form/index';

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
          <div className="token-add-path-field">
            <label htmlFor={inputName}>{inputLabel}</label>
            <TextField
              id={inputName}
              name={inputName}
              label={inputLabel}
              value={path}
              placeholder={placeholder}
              className="eu-control"
              onChange={setPath}
              onCommit={setPath}
            />
          </div>
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
