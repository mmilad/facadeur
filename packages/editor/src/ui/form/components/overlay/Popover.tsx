import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { ReactNode } from 'react';

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
}: {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="eu-popover-content"
          sideOffset={6}
          collisionPadding={8}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
