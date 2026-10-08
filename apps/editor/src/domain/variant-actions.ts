import type { EditorSession } from './session';
import { nextVariantIdentity, ownsVariantContract, variantLabelMap } from './edits/variant-edit';

/** Both creation entry points use the same persisted command and activation policy. */
export function createNamedVariant(session: EditorSession, requestedLabel?: string): string | null {
  const { document } = session.getSnapshot();
  if (!ownsVariantContract(document.kind)) return null;
  const identity = nextVariantIdentity(document);
  const label = (requestedLabel ?? identity.label).trim();
  if (!label) {
    session.setNotice('Variant labels must not be empty', 'error');
    return null;
  }
  session.execute({ type: 'createVariantPreset', name: identity.name, label });
  const saved = session.getSnapshot().document;
  if (
    !saved.variantPresets?.some((preset) => preset.name === identity.name) ||
    saved.variantLabels?.[identity.name] !== label
  )
    return null;
  session.setActiveVariant(identity.name);
  return identity.name;
}

export function renameNamedVariant(session: EditorSession, name: string, label: string): void {
  const { document } = session.getSnapshot();
  if (!ownsVariantContract(document.kind)) return;
  const labels = variantLabelMap(document, name, label) ?? null;
  session.execute({ type: 'setVariantLabels', labels });
}
