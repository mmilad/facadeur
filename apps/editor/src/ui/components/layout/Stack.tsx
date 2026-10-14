import type { CSSProperties, ReactNode } from 'react';

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
  const resolvedGap = gap ?? 'var(--eu-current-gap, var(--eu-gap-compact))';
  return (
    <div className={`eu-stack ${className ?? ''}`.trim()} style={{ gap: resolvedGap, ...style }}>
      {children}
    </div>
  );
}
