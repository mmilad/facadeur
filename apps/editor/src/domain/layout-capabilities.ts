import {
  findParent,
  type Breakpoint,
  type FlatDocument,
  type FlatNode,
  type Layout,
} from '@facadeur/core';

/** Layout fields exposed by the structured editor. */
export type LayoutField =
  | 'position'
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'direction'
  | 'gap'
  | 'padding'
  | 'margin'
  | 'justify'
  | 'align'
  | 'wrap';

export type LayoutDisplayMode = 'flex' | 'grid' | 'flow';

export interface LayoutPropertyCapability {
  supported: boolean;
  reason?: string;
}

export interface LayoutCapabilities {
  /** The selected node is a container only when it has a native flex/grid display. */
  selectedRole: 'container' | 'item';
  selectedDisplay: LayoutDisplayMode;
  /** Direct parent context. Absolute nodes participate in normal flow as neither. */
  parentId: string | null;
  parentDisplay: LayoutDisplayMode;
  isDirectFlexItem: boolean;
  isDirectGridItem: boolean;
  isAbsolute: boolean;
  breakpointId: string | null;
  variantName: string | null;
  availableFields: readonly LayoutField[];
  disabledReasons: Partial<Record<LayoutField, string>>;
  property(property: string): LayoutPropertyCapability;
}

export interface LayoutCapabilitiesInput {
  document: FlatDocument;
  nodeId: string;
  /** Resolved master root when the selected node is an instance being styled. */
  instanceRoot?: FlatNode;
  breakpointId?: string | null;
  variantName?: string | null;
  breakpoints?: readonly Breakpoint[];
  /** Effective CSS declarations keyed by node id. */
  styleDeclarations?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

const STRUCTURED_FIELDS: readonly LayoutField[] = [
  'position',
  'x',
  'y',
  'width',
  'height',
  'direction',
  'gap',
  'padding',
  'margin',
  'justify',
  'align',
  'wrap',
];

const NATIVE_CONTROL_TAGS = new Set(['input', 'select', 'textarea']);

/**
 * Resolve the fields that have meaning in the selected node's effective layout
 * context. The active document is expected to already contain any named
 * variant node overlay; breakpoint layers are resolved here.
 */
export function layoutCapabilities(input: LayoutCapabilitiesInput): LayoutCapabilities {
  const node = input.document.nodes[input.nodeId];
  const selectedNode = node?.type === 'instance' && input.instanceRoot ? input.instanceRoot : node;
  const parent = node ? findParent(input.document, node.id) : undefined;
  const breakpointId = input.breakpointId ?? null;
  const nodeDeclarations = input.styleDeclarations?.[node?.id ?? ''];
  const position = readDeclaration(nodeDeclarations, 'position');
  const isAbsolute = Boolean(
    node &&
    (position
      ? position === 'absolute'
      : effectiveLayout('layout' in node ? node.layout : undefined, breakpointId, input.breakpoints)
          .position === 'absolute'),
  );
  const selectedDisplay = selectedNode
    ? displayMode(selectedNode, input.styleDeclarations?.[node?.id ?? selectedNode.id])
    : 'flow';
  const parentDisplay = parent ? displayMode(parent, input.styleDeclarations?.[parent.id]) : 'flow';
  const directFlexItem = Boolean(parent && parentDisplay === 'flex' && !isAbsolute);
  const directGridItem = Boolean(parent && parentDisplay === 'grid' && !isAbsolute);
  const selectedRole: LayoutCapabilities['selectedRole'] =
    selectedDisplay === 'flex' || selectedDisplay === 'grid' ? 'container' : 'item';

  const available = new Set<LayoutField>(['position', 'width', 'height', 'margin']);
  const disabledReasons: Partial<Record<LayoutField, string>> = {};
  const structural = node?.type === 'repeater' || node?.type === 'switch';
  const selectedIsFrame = selectedNode?.type === 'frame';
  if (selectedIsFrame) available.add('padding');

  if (selectedIsFrame && selectedDisplay === 'flex') {
    available.add('direction');
    available.add('gap');
    available.add('justify');
    available.add('align');
    available.add('wrap');
  } else {
    const reason = selectedIsFrame
      ? `The selected frame resolves to ${selectedDisplay} layout; flex container controls are inactive.`
      : 'The selected node is an item, so container controls are inactive.';
    for (const field of ['direction', 'justify', 'align', 'wrap'] as const) {
      disabledReasons[field] = reason;
    }
    if (selectedIsFrame && selectedDisplay === 'grid') available.add('gap');
    else disabledReasons.gap = reason;
  }

  if (isAbsolute) {
    disabledReasons.x = 'Absolute positioning is active; X and Y are available.';
    disabledReasons.y = 'Absolute positioning is active; X and Y are available.';
    available.add('x');
    available.add('y');
  }

  const property = (propertyName: string): LayoutPropertyCapability =>
    structural
      ? { supported: false, reason: 'Repeater and Switch have no style or layout.' }
      : cssPropertyCapability(
          propertyName,
          selectedDisplay,
          parentDisplay,
          directFlexItem,
          directGridItem,
        );

  return {
    selectedRole,
    selectedDisplay,
    parentId: parent?.id ?? null,
    parentDisplay,
    isDirectFlexItem: directFlexItem,
    isDirectGridItem: directGridItem,
    isAbsolute,
    breakpointId,
    variantName: input.variantName ?? null,
    availableFields: structural ? [] : [...available],
    disabledReasons: structural
      ? Object.fromEntries(
          STRUCTURED_FIELDS.map((field) => [field, 'Repeater and Switch have no style or layout.']),
        )
      : disabledReasons,
    property,
  };
}

export function effectiveLayout(
  layout: Layout | undefined,
  breakpointId: string | null = null,
  breakpoints: readonly Breakpoint[] = [],
): Layout {
  const result: Layout = { ...(layout ?? {}) };
  if (!breakpointId) return result;
  const targetWidth = breakpoints.find((item) => item.uuid === breakpointId)?.minWidth;
  const layers = Object.entries(layout?.breakpoints ?? {})
    .map(([id, value]) => ({
      id,
      value,
      width: breakpoints.find((item) => item.uuid === id)?.minWidth,
    }))
    .filter(
      (item) =>
        item.width !== undefined && (targetWidth === undefined || item.width <= targetWidth),
    )
    .sort((left, right) => left.width! - right.width!);
  for (const layer of layers) Object.assign(result, layer.value);
  return result;
}

export function displayMode(
  node: FlatNode,
  declarations: Readonly<Record<string, string>> | undefined,
): LayoutDisplayMode {
  const value = readDeclaration(declarations, 'display');
  if (value === 'flex' || value === 'inline-flex') return 'flex';
  if (value === 'grid' || value === 'inline-grid') return 'grid';
  if (value) return 'flow';
  if (node.type === 'frame' && (!node.tag || !NATIVE_CONTROL_TAGS.has(node.tag.toLowerCase()))) {
    return 'flex';
  }
  return 'flow';
}

function cssPropertyCapability(
  property: string,
  selectedDisplay: LayoutDisplayMode,
  parentDisplay: LayoutDisplayMode,
  directFlexItem: boolean,
  directGridItem: boolean,
): LayoutPropertyCapability {
  const name = property
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
  if (!name || name === 'display' || name.startsWith('--')) return { supported: true };

  const flexContainer = new Set(['flex-direction', 'flex-flow', 'flex-wrap']);
  if (flexContainer.has(name)) {
    return selectedDisplay === 'flex'
      ? { supported: true }
      : { supported: false, reason: 'This property applies to a flex container.' };
  }
  if (
    name === 'gap' ||
    name === 'row-gap' ||
    name === 'column-gap' ||
    name === 'justify-content' ||
    name === 'align-items' ||
    name === 'align-content' ||
    name === 'place-content' ||
    name === 'place-items'
  ) {
    return selectedDisplay === 'flex' || selectedDisplay === 'grid'
      ? { supported: true }
      : { supported: false, reason: 'This property applies to a flex or grid container.' };
  }
  if (new Set(['flex', 'flex-basis', 'flex-grow', 'flex-shrink']).has(name)) {
    return directFlexItem
      ? { supported: true }
      : {
          supported: false,
          reason: 'This property applies to an item directly inside a flex container.',
        };
  }
  if (new Set(['align-self', 'order', 'place-self']).has(name)) {
    return directFlexItem || directGridItem
      ? { supported: true }
      : {
          supported: false,
          reason: 'This property applies to an item directly inside a flex or grid container.',
        };
  }
  if (
    new Set([
      'grid-area',
      'grid-column',
      'grid-column-start',
      'grid-column-end',
      'grid-row',
      'grid-row-start',
      'grid-row-end',
      'justify-self',
    ]).has(name)
  ) {
    return directGridItem
      ? { supported: true }
      : {
          supported: false,
          reason: 'This property applies to an item directly inside a grid container.',
        };
  }
  if (
    new Set([
      'grid',
      'grid-template',
      'grid-template-areas',
      'grid-template-columns',
      'grid-template-rows',
      'grid-auto-flow',
      'grid-auto-columns',
      'grid-auto-rows',
      'justify-items',
    ]).has(name)
  ) {
    return selectedDisplay === 'grid'
      ? { supported: true }
      : { supported: false, reason: 'This property applies to a grid container.' };
  }
  return { supported: true };
}

function readDeclaration(
  declarations: Readonly<Record<string, string>> | undefined,
  name: string,
): string | undefined {
  if (!declarations) return undefined;
  const canonical = name.toLowerCase();
  for (const [key, value] of Object.entries(declarations)) {
    if (key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() === canonical) {
      return value.trim().toLowerCase();
    }
  }
  return undefined;
}

export const layoutStructuredFields = STRUCTURED_FIELDS;
