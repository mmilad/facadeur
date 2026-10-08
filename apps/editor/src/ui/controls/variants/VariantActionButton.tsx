import * as Popover from '@radix-ui/react-popover';
import { useRef, useState, type ComponentProps } from 'react';
import { Field, TextInput } from '../../form/index';

/** Selection stays on the button; secondary actions open only on request. */
export function VariantActionButton({
  label,
  onRename,
  ...buttonProps
}: ComponentProps<'button'> & { label: string; onRename: (label: string) => void }) {
  const [stage, setStage] = useState<'menu' | 'rename' | null>(null);
  const [draft, setDraft] = useState(label);
  const buttonRef = useRef<HTMLButtonElement>(null);
  function openMenu() {
    setDraft(label);
    setStage('menu');
  }
  function applyRename() {
    if (!draft.trim()) return;
    onRename(draft);
    setStage(null);
  }
  return (
    <Popover.Root open={stage !== null} onOpenChange={(open) => !open && setStage(null)}>
      <Popover.Anchor asChild>
        <button
          {...buttonProps}
          ref={buttonRef}
          type="button"
          aria-haspopup="menu"
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openMenu();
          }}
          onKeyDown={(event) => {
            if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
              event.preventDefault();
              openMenu();
            }
          }}
        />
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          className="eu-popover-content variant-actions-popover"
          sideOffset={6}
          collisionPadding={8}
          aria-label={stage === 'rename' ? `Rename ${label}` : `${label} actions`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            buttonRef.current?.focus();
          }}
        >
          {stage === 'menu' ? (
            <div role="menu" aria-label={`${label} actions`}>
              <button
                className="eu-button"
                type="button"
                role="menuitem"
                onClick={() => setStage('rename')}
              >
                Rename
              </button>
            </div>
          ) : (
            <form
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
                  event.preventDefault();
                  applyRename();
                }
              }}
              onSubmit={(event) => {
                event.preventDefault();
                applyRename();
              }}
            >
              <Field label="Name">
                <TextInput
                  name="variant-rename"
                  aria-label="Variant name"
                  value={draft}
                  onChange={setDraft}
                  autoFocus
                />
              </Field>
              <div className="variant-rename-actions">
                <button className="eu-button" type="button" onClick={() => setStage(null)}>
                  Cancel
                </button>
                <button
                  className="eu-button eu-button--primary"
                  type="submit"
                  disabled={!draft.trim()}
                >
                  Apply
                </button>
              </div>
            </form>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
