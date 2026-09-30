import { TokenValueControl } from '../fields/TokenValueControl.js';

export function ShadowControl({
  name,
  label,
  value,
  shadowTokens,
  onCommit,
}: {
  name?: string;
  label?: string;
  value: string;
  shadowTokens: readonly string[];
  onCommit: (next: string | null) => void;
}) {
  return (
    <TokenValueControl
      name={name}
      label={label ?? 'Shadow'}
      value={value}
      tokens={shadowTokens}
      placeholder="0 8px 24px rgba(0,0,0,0.12)"
      onCommit={onCommit}
    />
  );
}
