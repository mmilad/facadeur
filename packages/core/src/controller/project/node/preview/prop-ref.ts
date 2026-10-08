import type { FieldValue, ProjectCatalog } from '@facadeur/domain';

const PROP_REF = /^\{prop:([^}]+)\}$/;

export type DesignPropOption = {
  uuid: string;
  name: string;
  /** Stored field value: `{prop:uuid}`. */
  ref: string;
};

export function encodePropRef(uuid: string): string {
  return `{prop:${uuid}}`;
}

export function parsePropRef(value: FieldValue | undefined): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(PROP_REF);
  return match?.[1] ?? null;
}

export function isPropRef(value: FieldValue | undefined): boolean {
  return parsePropRef(value) !== null;
}

export function designPropOptions(catalog: ProjectCatalog): DesignPropOption[] {
  const props = catalog.props ?? {};
  return Object.values(props)
    .map((prop) => ({
      uuid: prop.uuid,
      name: prop.name,
      ref: encodePropRef(prop.uuid),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
