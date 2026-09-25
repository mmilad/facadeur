import { useState, type ReactNode } from 'react';
import { Popover } from './Popover.js';

export function AddPopover({
  label,
  children,
  onConfirm,
}: {
  label: string;
  children: ReactNode;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button type="button" className="eu-icon-button" aria-label={label} title={label}>
          +
        </button>
      }
    >
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="eu-button" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="eu-button eu-button--primary"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </Popover>
  );
}
