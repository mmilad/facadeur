import type { CSSProperties, ReactNode } from 'react';
import { gapForDensity } from '../../const/index.js';
import { useOptionalFormContext } from '../../FormContext.js';

export function Stack({
  children,
  gap,
  style,
  className,
}: {
  children: ReactNode;
  gap?: string | number;
  style?: CSSProperties;
  className?: string;
}) {
  const form = useOptionalFormContext();
  const resolvedGap = gap ?? (form ? gapForDensity(form.density) : 'var(--eu-gap-compact)');
  return (
    <div className={`eu-stack ${className ?? ''}`.trim()} style={{ gap: resolvedGap, ...style }}>
      {children}
    </div>
  );
}
