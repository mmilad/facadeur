import type { FieldValue, JsonSchemaObject, ProjectCatalog } from '@facadeur/domain';
import { componentPropsForSchema } from '../../catalog/field-ids';

const PROP_REF = /^\{prop:([^}]+)\}$/;
const COMPONENT_PROP_REF = /^\{props:([^}]+)\}$/;

export type DesignPropOption = {
  uuid: string;
  name: string;
  /** Stored field value: `{prop:uuid}`. */
  ref: string;
  kind: 'design' | 'component';
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
  return match?.[1] ?? null;
}

export function isPropRef(value: FieldValue | undefined): boolean {
  return parsePropRef(value) !== null;
}

export function designPropOptions(
  catalog: ProjectCatalog,
  componentSchema?: JsonSchemaObject | null,
): DesignPropOption[] {
  const props = catalog.props ?? {};
  const designOptions = Object.values(props)
    .map((prop) => ({
      uuid: prop.uuid,
      name: prop.name,
      ref: encodePropRef(prop.uuid),
      kind: 'design' as const,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const componentOptions = componentSchema
    ? componentPropsForSchema(componentSchema).map((prop) => ({
        ...prop,
        ref: encodeComponentPropRef(prop.uuid),
        kind: 'component' as const,
      }))
    : [];
  return [...designOptions, ...componentOptions];
}
