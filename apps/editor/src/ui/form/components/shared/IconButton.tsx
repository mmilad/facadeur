import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export const IconButton = forwardRef(function IconButton(
  {
    label,
    children,
    className,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    children: ReactNode;
  },
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`eu-icon-button ${className ?? ''}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
});
