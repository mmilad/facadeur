import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './IconButton.module.css';

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
      className={`${styles.button} ${className ?? ''}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
});
