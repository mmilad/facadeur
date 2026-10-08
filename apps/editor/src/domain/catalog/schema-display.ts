import type { JsonSchemaObject } from '@facadeur/domain';

export function catalogSchemaTitle(schema: JsonSchemaObject | undefined, id: string): string {
  const title = schema && typeof schema.title === 'string' ? schema.title.trim() : '';
  if (title) return title;
  return `Schema ${id.slice(0, 8)}…`;
}
