import { layerSelectorForName } from '@facadeur/core';
import type { FieldValue, GlobalStyleRule, Node, NodeDefinition } from '@facadeur/domain';
import type { JsonSchemaObject } from '@facadeur/domain';
import { defaultIcons } from '../catalog/icons';

export const colors = {
  ink: '#25242a',
  muted: '#817f88',
  line: '#e8e6e2',
  paper: '#ffffff',
  canvas: '#f2f1ef',
  subtle: '#f7f6f4',
  accent: '#6754d9',
  accentSoft: '#f0edff',
  green: '#277c58',
  red: '#b94848',
} as const;

export const uuid = (value: number) =>
  `660e8400-e29b-41d4-a716-${value.toString(16).padStart(12, '0')}`;
export const prop = (value: number) => uuid(3000 + value);
const iconsById = new Map(defaultIcons.map((icon) => [icon.id, icon]));
const styleRulesByNode = new Map<string, GlobalStyleRule>();
type ExampleStyle = Readonly<Record<string, string>>;

export function iconSource(id: string) {
  const data = iconsById.get(id)?.data;
  if (!data) return '';
  const paths = data.paths.map((path) => `<path d="${path}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${data.viewBox}" fill="currentColor">${paths}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const labelStyle: ExampleStyle = {
  color: colors.muted,
  fontSize: '10px',
  fontWeight: '650',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};
export const smallText: ExampleStyle = { color: colors.muted, fontSize: '12px' };
export const row: ExampleStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
};
export const panel: ExampleStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '18px 16px',
  backgroundColor: colors.paper,
};

export function leaf(id: number, name: string, text: string, style: ExampleStyle = {}): Node {
  return styledNode({ uuid: uuid(id), name, dom: { tagName: 'div', text } }, style);
}

export function image(id: number, name: string, source: string, style: ExampleStyle = {}): Node {
  return styledNode(
    { uuid: uuid(id), name, dom: { tagName: 'img', attributes: { src: source, alt: '' } } },
    { width: '16px', height: '16px', objectFit: 'contain', flexShrink: '0', ...style },
  );
}

export function group(id: number, name: string, children: Node[], style: ExampleStyle = {}): Node {
  return styledNode({ uuid: uuid(id), name, dom: { tagName: 'div', children } }, style);
}

export function styledNode(node: Node, declarations: ExampleStyle): Node {
  if (Object.keys(declarations).length) {
    registerExampleStyle(node.uuid, node.name ?? 'Layer', { declarations });
  }
  return node;
}

export function registerExampleStyle(
  nodeUuid: string,
  name: string,
  layer: Pick<GlobalStyleRule, 'declarations' | 'states' | 'variants' | 'breakpoints'>,
) {
  const previous = styleRulesByNode.get(nodeUuid);
  const className = layerSelectorForName(name).slice(1);
  const rule: GlobalStyleRule = {
    id: `layer-${nodeUuid}`,
    selector: `.${className}`,
    bindings: { [className]: nodeUuid },
    ...(previous ? mergeRuleLayer(previous, layer) : layer),
  };
  styleRulesByNode.set(nodeUuid, rule);
}

export function facadeurEditorStyleRules() {
  return [...styleRulesByNode.values()];
}

export function textProp(id: number): string {
  return `{props:${prop(id)}}`;
}

function mergeRuleLayer(
  lower: Pick<GlobalStyleRule, 'declarations' | 'states' | 'variants' | 'breakpoints'>,
  upper: Pick<GlobalStyleRule, 'declarations' | 'states' | 'variants' | 'breakpoints'>,
) {
  return mergeSparse(lower, upper);
}

function mergeSparse<T>(lower: T, upper: unknown): T {
  if (!isRecord(lower) || !isRecord(upper)) return upper as T;
  const result: Record<string, unknown> = { ...lower };
  for (const [key, value] of Object.entries(upper)) {
    result[key] =
      isRecord(result[key]) && isRecord(value) ? mergeSparse(result[key], value) : value;
  }
  return result as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function componentDefinition(
  id: number,
  name: string,
  fields: Readonly<Record<string, { type: 'string'; default: string }>>,
  root: Node,
): NodeDefinition {
  const properties = Object.fromEntries(
    Object.entries(fields).map(([key, value], index) => [
      key,
      {
        type: value.type,
        default: value.default,
        'x-facadeur-prop-id': prop(id * 10 + index + 1),
      },
    ]),
  );
  const previewData: Record<string, FieldValue> = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value.default]),
  );
  return {
    uuid: uuid(id),
    name,
    kind: 'component',
    schema: {
      kind: 'inline',
      schema: { type: 'object', properties, additionalProperties: false } as JsonSchemaObject,
    },
    config: { previewData: { fields: previewData } },
    root,
  };
}

export function componentInstance(
  id: number,
  name: string,
  definitionId: number | string,
  fields: Record<string, FieldValue> = {},
): Node {
  return {
    uuid: uuid(id),
    name,
    dom: { tagName: 'div' },
    config: {
      definitionRef: typeof definitionId === 'number' ? uuid(definitionId) : definitionId,
      ...(Object.keys(fields).length ? { previewData: { fields } } : {}),
    },
  };
}
