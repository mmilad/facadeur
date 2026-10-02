import type { ReactNode } from 'react';
import './icon-choice.css';

type IconChoice = {
  value: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  title?: string;
  showLabel?: boolean;
};

/** Private layout selector: native buttons retain keyboard and fieldset behavior. */
export function LayoutIconChoice({
  label,
  value,
  options,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  options: readonly IconChoice[];
  disabled?: boolean;
  onCommit: (value: string) => void;
}) {
  return (
    <div className="layout-icon-choice" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={value === option.value}
          title={option.title ?? option.label}
          disabled={disabled || option.disabled}
          onClick={() => onCommit(option.value)}
        >
          {option.icon}
          {option.showLabel ? <span>{option.label}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function LayoutChoiceIcon({
  kind,
  vertical = false,
  cross = false,
}: {
  kind:
    | 'default'
    | 'row'
    | 'column'
    | 'start'
    | 'center'
    | 'end'
    | 'space-between'
    | 'stretch'
    | 'flow'
    | 'flex'
    | 'grid';
  vertical?: boolean;
  cross?: boolean;
}) {
  let drawing: ReactNode;
  if (kind === 'default') {
    drawing = <path d="M6 8a7 7 0 1 1-1 7M6 3v5H1" />;
  } else if (kind === 'flow') {
    drawing = (
      <>
        <path d="M4 5h16M4 12h12M4 19h16" />
      </>
    );
  } else if (kind === 'grid') {
    drawing = (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    );
  } else if (kind === 'row' || kind === 'column' || kind === 'flex') {
    drawing = (
      <g transform={kind === 'column' ? 'rotate(90 12 12)' : undefined}>
        <rect x="3" y="6" width="5" height="12" />
        <rect x="10" y="6" width="5" height="12" />
        <path d="M17 12h5m-3-3 3 3-3 3" />
      </g>
    );
  } else {
    const offset = kind === 'center' ? 8 : kind === 'end' ? 14 : 2;
    drawing = (
      <g transform={vertical ? 'rotate(90 12 12)' : undefined}>
        <path d="M2 2v20M22 2v20" />
        {cross ? (
          <>
            <rect
              x={kind === 'stretch' ? 3 : offset + 1}
              y="4"
              width={kind === 'stretch' ? 18 : 6}
              height="6"
            />
            <rect
              x={kind === 'stretch' ? 3 : offset + 1}
              y="14"
              width={kind === 'stretch' ? 18 : 6}
              height="6"
            />
          </>
        ) : (
          <>
            <rect x={kind === 'space-between' ? 3 : offset + 1} y="5" width="3" height="14" />
            <rect x={kind === 'space-between' ? 18 : offset + 5} y="7" width="3" height="10" />
          </>
        )}
      </g>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {drawing}
    </svg>
  );
}
