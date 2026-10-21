import type { FieldValue, JsonSchemaObject, ProjectCatalog } from '@facadeur/domain';
import { componentPropsForSchema } from '../../../../queries';
import { referenceOptionsForScopes, type RepeaterReferenceScope } from './reference-resolver';

const PROP_REF = /^\{prop:([^}]+)\}$/;
const COMPONENT_PROP_REF = /^\{props:([^}]+)\}$/;

export type DesignPropOption = {
  uuid: string;
  name: string;
  /** Stored field value: `{prop:uuid}`. */
  ref: string;
  kind: 'design' | 'component' | 'item' | 'index';
  valueType?: string;
};

export function encodePropRef(uuid: string): string {
  return `{prop:${uuid}}`;
}

export function encodeComponentPropRef(uuid: string): string {
  return `{props:${uuid}}`;
}

export function parsePropRef(value: FieldValue | undefined): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(PROP_REF) ?? value.match(COMPONENT_PROP_REF);
  if (match?.[1]) return match[1];
  const item = /^\{item-prop:([^:}]+):([^}]+)\}$/.exec(value);
  if (item?.[1] && item[2]) return `item:${item[1]}:${item[2]}`;
  const index = /^\{index:([^}]+)\}$/.exec(value);
  return index?.[1] ? `index:${index[1]}` : null;
}

export function isPropRef(value: FieldValue | undefined): boolean {
  return parsePropRef(value) !== null;
}

export function designPropOptions(
  catalog: ProjectCatalog,
  componentSchema?: JsonSchemaObject | null,
  repeaterScopes: readonly RepeaterReferenceScope[] = [],
): DesignPropOption[] {
  const props = catalog.props ?? {};
  const designOptions = Object.values(props)
    .map((prop) => ({
      uuid: prop.uuid,
      name: prop.name,
      ref: encodePropRef(prop.uuid),
      kind: 'design' as const,
      valueType: 'string',
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const componentOptions = componentSchema
    ? componentPropsForSchema(componentSchema).map((prop) => ({
        ...prop,
        ref: encodeComponentPropRef(prop.uuid),
        kind: 'component' as const,
      }))
    : [];
  return [...designOptions, ...componentOptions, ...referenceOptionsForScopes(repeaterScopes)];
}
