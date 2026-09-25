import { useState, type ReactNode } from 'react';
import { Stack } from './Stack.js';

export function Section({
  title,
  action,
  collapsible = false,
  defaultOpen = true,
  children,
}: {
  title?: string;
  action?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;

  return (
    <section className="eu-section">
      {title || action ? (
        <div className="eu-section__header">
          {title ? (
            collapsible ? (
              <button
                type="button"
                className="eu-section__title"
                style={{
                  background: 'none',
                  border: 0,
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
              >
                {title}
              </button>
            ) : (
              <h3 className="eu-section__title">{title}</h3>
            )
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {showBody ? <Stack>{children}</Stack> : null}
    </section>
  );
}
