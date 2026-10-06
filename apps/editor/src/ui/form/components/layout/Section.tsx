import { useState, type ReactNode } from 'react';
import { Stack } from './Stack.js';
import { DisclosureButton } from './DisclosureButton.js';

export function Section({
  title,
  action,
  collapsible = false,
  defaultOpen = true,
  children,
  appearance = 'plain',
  keepMounted = false,
}: {
  title?: string;
  action?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  appearance?: 'plain' | 'accordion';
  keepMounted?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;

  return (
    <section
      className={appearance === 'accordion' ? 'eu-section eu-section--accordion' : 'eu-section'}
    >
      {title || action ? (
        <div className="eu-section__header">
          {title ? (
            collapsible && appearance === 'accordion' ? (
              <DisclosureButton expanded={open} onClick={() => setOpen((value) => !value)}>
                {title}
              </DisclosureButton>
            ) : collapsible ? (
              <button
                type="button"
                className="eu-section__title eu-section__title--collapsible"
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
      {showBody || keepMounted ? (
        <Stack style={showBody ? undefined : { display: 'none' }}>{children}</Stack>
      ) : null}
    </section>
  );
}
