import type { CSSProperties, ReactNode } from 'react';
import { gapForDensity } from '../../const/index.js';
import { useOptionalFormContext } from '../../FormContext.js';

export function Inline({
  children,
  gap,
  align = 'center',
  style,
  className,
}: {
  children: ReactNode;
  gap?: string | number;
  align?: CSSProperties['alignItems'];
  style?: CSSProperties;
  className?: string;
}) {
  const form = useOptionalFormContext();
  const resolvedGap = gap ?? (form ? gapForDensity(form.density) : 'var(--eu-gap-compact)');
  return (
    <div
      className={`eu-inline ${className ?? ''}`.trim()}
      style={{ gap: resolvedGap, alignItems: align, ...style }}
    >
      {children}
    </div>
  );
}
