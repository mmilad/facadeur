import type { CSSProperties, ReactNode } from 'react';

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
  const resolvedGap = gap ?? 'var(--eu-current-gap, var(--eu-gap-compact))';
  return (
    <div
      className={`eu-inline ${className ?? ''}`.trim()}
      style={{ gap: resolvedGap, alignItems: align, ...style }}
    >
      {children}
    </div>
  );
}
