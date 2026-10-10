import type { ReactNode } from 'react';
import { TokenValueControl } from './controls/fields/TokenValueControl';

/** A labeled row for token editors, with an optional inherited hint and action. */
export function TokenEditorField({
  label,
  children,
  name,
  value,
  tokens,
  onCommit,
  placeholder,
  tokenOnly,
  color,
  hint,
  action,
  className,
}: {
  label: string;
  children?: ReactNode;
  name?: string;
  value?: string;
  tokens?: readonly string[];
  onCommit?: (value: string | null) => void;
  placeholder?: string;
  tokenOnly?: boolean;
  color?: boolean;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const hasTokenControl = value !== undefined && tokens !== undefined && onCommit !== undefined;
  const hasMeta = Boolean(hint ?? action);
  return (
    <div
      className={['token-editor-field', hasMeta && 'token-editor-field--with-meta', className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="token-editor-field__label">{label}</span>
      <div className="token-editor-field__control">
        {hasTokenControl ? (
          <TokenValueControl
            name={name}
            label={label}
            value={value}
            tokens={tokens}
            onCommit={onCommit}
            placeholder={placeholder}
            tokenOnly={tokenOnly}
            color={color}
          />
        ) : (
          children
        )}
      </div>
      {hasMeta ? (
        <div className="token-editor-field__meta">
          {hint}
          {action}
        </div>
      ) : null}
    </div>
  );
}
