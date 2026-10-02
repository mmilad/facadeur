import { TokenValueControl } from '../fields/TokenValueControl.js';

export function ColorControl({
  name,
  label,
  value,
  colorTokens,
  onCommit,
}: {
  name?: string;
  label?: string;
  value: string;
  colorTokens: readonly string[];
  onCommit: (next: string | null) => void;
}) {
  return (
    <TokenValueControl
      name={name}
      label={label === undefined ? 'Color' : label}
      value={value}
      tokens={colorTokens}
      color
      onCommit={onCommit}
    />
  );
}
