import type { NodeDefinitionModel, ProjectCatalogModel } from '@facadeur/core';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function schemaTitle(catalog: ProjectCatalogModel, definition: NodeDefinitionModel): string | null {
  if (definition.schema.kind === 'ref') {
    const schema = catalog.schemas?.[definition.schema.uuid];
    if (schema && typeof schema === 'object' && 'title' in schema) {
      const title = (schema as { title?: unknown }).title;
      if (typeof title === 'string' && title.trim()) return title.trim();
    }
    return null;
  }
  const title = definition.schema.schema.title;
  return typeof title === 'string' && title.trim() ? title.trim() : null;
}

/** Human-readable catalog definition label for trees, breadcrumbs, and chrome. */
export function catalogDefinitionDisplayName(
  catalog: ProjectCatalogModel,
  definition: NodeDefinitionModel,
): string {
  const raw = definition.name?.trim() ?? '';
  if (raw && !looksLikeUuid(raw)) return raw;
  const fromSchema = schemaTitle(catalog, definition);
  if (fromSchema) return fromSchema;
  if (raw) return raw;
  return definition.kind.charAt(0).toUpperCase() + definition.kind.slice(1);
}
