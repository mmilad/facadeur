import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="eu-dialog-overlay" />
        <Dialog.Content className="eu-dialog-content">
          <Dialog.Title className="eu-dialog__title">{title}</Dialog.Title>
          {children}
          {footer ? <div className="eu-dialog__footer">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ModalTrigger({
  trigger,
  title,
  children,
  footer,
}: {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
  footer?: (close: () => void) => ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="eu-dialog-overlay" />
        <Dialog.Content className="eu-dialog-content">
          <Dialog.Title className="eu-dialog__title">{title}</Dialog.Title>
          {children}
          <Dialog.Close asChild>
            <button type="button" className="eu-button" style={{ display: 'none' }} aria-hidden />
          </Dialog.Close>
          {footer ? (
            <div className="eu-dialog__footer">
              {footer(() => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
              })}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
