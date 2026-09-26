import type { DefaultKind } from '@facadeur/core';

const KIND_BADGE_LABEL: Record<DefaultKind, string> = {
  atom: 'atom',
  component: 'component',
  section: 'section',
  page: 'page',
};

export function KindBadge({ kind }: { kind: string }) {
  const label =
    kind === 'atom' || kind === 'component' || kind === 'section' || kind === 'page'
      ? KIND_BADGE_LABEL[kind]
      : kind;
  return (
    <span className="kind-badge" data-kind={kind} title={`Document kind: ${label}`}>
      {label}
    </span>
  );
}
