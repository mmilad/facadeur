import type { DesignTokenValue } from '@facadeur/core';
import { formatTokenValue } from '../../../domain/edits/token-edit';

export function TokenPreview({
  value,
  type,
  color,
  shadow,
  resolved,
  resolve,
}: {
  value: DesignTokenValue;
  type: string;
  color: string | null;
  shadow: string | null;
  resolved?: string;
  resolve: (reference: string) => string | undefined;
}) {
  const previewText = formatTokenValue(value);
  const previewValue = resolved ?? previewText;
  const dimension =
    type === 'dimension' && typeof value === 'string' ? dimensionPreview(value) : null;
  const typography = type === 'typography' && isRecord(value) ? value : null;
  const typographyFamily =
    typography && typeof typography.fontFamily === 'string'
      ? (resolve(typography.fontFamily) ?? typography.fontFamily)
      : undefined;
  const typographySize =
    typography && typeof typography.fontSize === 'string'
      ? (resolve(typography.fontSize) ?? typography.fontSize)
      : undefined;
  const shadowObject = type === 'shadow' && isRecord(value) ? shadowPreview(value, resolve) : null;
  return (
    <div
      className={
        dimension ? 'token-table-preview token-table-preview--dimension' : 'token-table-preview'
      }
      title={previewText}
    >
      {color !== null ? (
        <span
          className="token-table-swatch"
          style={{ background: resolved ?? color }}
          aria-hidden="true"
        />
      ) : null}
      {shadow !== null || shadowObject !== null ? (
        <span
          className="token-table-swatch"
          style={{ boxShadow: resolved ?? shadowObject ?? shadow ?? undefined }}
          aria-hidden="true"
        />
      ) : null}
      {dimension ? (
        <span
          className="token-table-dimension-bar"
          style={{ width: dimension.width }}
          aria-hidden="true"
        />
      ) : null}
      {typography ? (
        <span
          className="token-table-type-sample"
          style={{ fontFamily: typographyFamily, fontSize: typographySize }}
          aria-hidden="true"
        >
          Aa
        </span>
      ) : null}
      {color === null && shadow === null && shadowObject === null && !dimension && !typography ? (
        <span className="token-table-preview-text">{previewValue}</span>
      ) : null}
      {color !== null || shadow !== null || shadowObject !== null ? (
        <span className="token-table-preview-text">{resolved ?? shadowObject ?? previewValue}</span>
      ) : null}
    </div>
  );
}

function dimensionPreview(value: string): { width: string } | null {
  const match = value
    .trim()
    .match(
      /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(px|rem|em|ch|ex|vw|vh|vmin|vmax|cm|mm|in|pt|pc|q|%)?$/i,
    );
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = match[2] ?? 'px';
  return { width: amount === 0 ? '2px' : `${Math.abs(amount)}${unit}` };
}

function shadowPreview(
  value: Readonly<Record<string, DesignTokenValue>>,
  resolve: (reference: string) => string | undefined,
): string | null {
  const part = (key: string, fallback: string) => {
    const raw = value[key];
    if (typeof raw !== 'string') return fallback;
    return raw.startsWith('{') ? (resolve(raw) ?? raw) : raw;
  };
  const color = part('color', 'rgba(0,0,0,.2)');
  const x = part('offsetX', '0px');
  const y = part('offsetY', '2px');
  const blur = part('blur', '8px');
  const spread = value.spread === undefined ? '' : ` ${part('spread', '0px')}`;
  return `${value.inset ? 'inset ' : ''}${x} ${y} ${blur}${spread} ${color}`;
}

function isRecord(value: unknown): value is Readonly<Record<string, DesignTokenValue>> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
