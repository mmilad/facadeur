import type { ButtonHTMLAttributes } from 'react';

export function DisclosureButton({
  expanded,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { expanded: boolean }) {
  return (
    <button
      {...props}
      type="button"
      className={className ? `eu-disclosure ${className}` : 'eu-disclosure'}
      aria-expanded={expanded}
    >
      <span className="eu-disclosure__chevron" aria-hidden="true">
        {expanded ? '⌄' : '›'}
      </span>
      {children}
    </button>
  );
}
