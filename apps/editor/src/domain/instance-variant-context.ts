import {
  resolvePreviewData,
  resolveVariantDocument,
  toFlat,
  toNested,
  type FieldValue,
  type FlatDocument,
  type FlatNode,
} from '@facadeur/core';
import type { EditorSnapshot } from './session/types';

export type InstanceVariantSource = 'preset' | 'rule' | 'fixed' | 'default';

export interface InstanceVariantContext {
  /** The document containing the selected instance, before any active preset. */
  ownerDocument: FlatDocument;
  /** The owner preset currently selected in the editor, if any. */
  ownerVariantName: string | null;
  /** The master document referenced by the instance. */
  targetDocument: FlatDocument;
  /** The instance as resolved through the owner's active preset. */
  ownerInstance: Extract<FlatNode, { type: 'instance' }>;
  /** The effective named preset selected on the master. */
  variantName: string;
  /** Effective legacy axes, including the master's fallback values. */
  axes: Readonly<Record<string, string>>;
  /** The resolved master document, retaining style layers for inspector reads. */
  document: FlatDocument;
  /** Where the effective named preset came from in the owner document. */
  source: InstanceVariantSource;
  /** Preview values used to evaluate ordered variant rules. */
  data: Readonly<Record<string, FieldValue>>;
}

export interface ResolveInstanceVariantContextInput {
  ownerDocument: FlatDocument;
  ownerVariantName?: string | null;
  instance: Extract<FlatNode, { type: 'instance' }>;
  targetDocument: FlatDocument;
}

/** Resolve the selected instance directly from an editor snapshot. */
export function resolveSelectedInstance(
  snap: Pick<EditorSnapshot, 'document' | 'activeVariantName' | 'selectedNode' | 'componentTarget'>,
): InstanceVariantContext | null {
  if (snap.selectedNode?.type !== 'instance' || !snap.componentTarget) return null;
  return resolveInstanceVariantContext({
    ownerDocument: snap.document,
    ownerVariantName: snap.activeVariantName,
    instance: snap.selectedNode,
    targetDocument: snap.componentTarget,
  });
}

/**
 * Resolve the same nested component preset that the preview renderer mounts.
 *
 * The owner preset is materialized first so a containing component/page preset
 * can change an instance's fixed variant or its ordered rules. Rule conditions
 * read the owner's resolved preview samples, matching the renderer's scope.
 */
export function resolveInstanceVariantContext({
  ownerDocument,
  ownerVariantName = null,
  instance,
  targetDocument,
}: ResolveInstanceVariantContextInput): InstanceVariantContext {
  const ownerActiveDocument = resolveOwnerDocument(ownerDocument, ownerVariantName);
  const ownerInstance = ownerActiveDocument.nodes[instance.id];
  const resolvedInstance =
    ownerInstance?.type === 'instance' && ownerInstance.component === instance.component
      ? ownerInstance
      : instance;
  const data = resolvePreviewData(ownerDocument, ownerVariantName);
  const fixedVariant = resolvedInstance.variants?.variant;
  const matchedRule =
    fixedVariant === undefined
      ? resolvedInstance.variantRules?.find((rule) => matchesCondition(rule.when, data))
      : undefined;
  const variantName = fixedVariant ?? matchedRule?.variant ?? 'default';
  const baseOwnerInstance = ownerDocument.nodes[instance.id];
  const source: InstanceVariantSource =
    fixedVariant !== undefined
      ? ownerVariantName &&
        (baseOwnerInstance?.type !== 'instance' ||
          baseOwnerInstance.variants?.variant !== fixedVariant)
        ? 'preset'
        : 'fixed'
      : matchedRule
        ? 'rule'
        : 'default';

  return {
    ownerDocument,
    ownerVariantName,
    targetDocument,
    ownerInstance: resolvedInstance,
    variantName,
    axes: Object.fromEntries(
      targetDocument.variants.flatMap((axis) => {
        const value = resolvedInstance.variants?.[axis.name] ?? axis.default ?? axis.values[0];
        return value === undefined ? [] : [[axis.name, value]];
      }),
    ),
    document: toFlat(
      resolveVariantDocument(toNested(targetDocument), variantName, {
        preserveStyleLayers: true,
      }),
    ),
    source,
    data,
  };
}

function resolveOwnerDocument(document: FlatDocument, variantName: string | null): FlatDocument {
  if (!variantName) return document;
  return toFlat(
    resolveVariantDocument(toNested(document), variantName, {
      preserveStyleLayers: true,
    }),
  );
}

function matchesCondition(
  condition: NonNullable<Extract<FlatNode, { type: 'instance' }>['variantRules']>[number]['when'],
  data: Readonly<Record<string, FieldValue>>,
): boolean {
  const value = resolvePath(data, condition.path);
  if ('truthy' in condition) return condition.truthy ? Boolean(value) : !value;
  if ('equals' in condition) return JSON.stringify(value) === JSON.stringify(condition.equals);
  return false;
}

function resolvePath(
  data: Readonly<Record<string, FieldValue>>,
  path: string,
): FieldValue | undefined {
  let current: FieldValue | undefined = data as Record<string, FieldValue>;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined;
    current = current[segment];
  }
  return current;
}
