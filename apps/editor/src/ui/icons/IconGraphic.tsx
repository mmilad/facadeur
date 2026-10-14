import type { IconDefinition } from '@facadeur/core';

export function IconGraphic({ icon, className }: { icon: IconDefinition; className?: string }) {
  return (
    <svg
      className={className}
      viewBox={icon.data.viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {icon.data.paths.map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
}
