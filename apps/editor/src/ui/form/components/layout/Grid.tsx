import type { CSSProperties, ReactNode } from 'react';

export function Grid({
  children,
  columns = 2,
  gap = 'var(--eu-gap-compact)',
  style,
  className,
}: {
  children: ReactNode;
  columns?: number;
  gap?: string | number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`eu-grid ${className ?? ''}`.trim()}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
