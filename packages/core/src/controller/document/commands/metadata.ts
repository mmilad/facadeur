import { DocumentError } from '../../../document/errors.js';
import { ID_PATTERN } from '../../../document/ids.js';
import type { FlatDocument } from '../../../document/flat.js';
import type { Command, CommandContext } from './types.js';

export function setDocumentMetadata(
  document: FlatDocument,
  command: Extract<Command, { type: 'setDocumentMetadata' }>,
  context: CommandContext,
) {
  const name = command.name.trim();
  const slug = command.slug.trim();
  if (!name) throw new DocumentError('schema', 'A document needs a name');
  if (!ID_PATTERN.test(slug)) {
    throw new DocumentError(
      'schema',
      'Identifiers must start with a letter and contain letters, numbers, hyphens or underscores',
    );
  }
  for (const other of context.schemaResolverContext?.documents.values() ?? []) {
    if (other.id !== document.id && (other.slug ?? other.id) === slug) {
      throw new DocumentError('duplicate-id', `Identifier "${slug}" is already in use`);
    }
  }
  document.name = name;
  if (slug === document.id) delete document.slug;
  else document.slug = slug;
}

export function setDocumentGroup(document: FlatDocument, group: string | null) {
  if (group !== null && typeof group !== 'string')
    throw new DocumentError('schema', 'Group name must be text');
  const name = group?.trim();
  if (name) document.group = name;
  else delete document.group;
}
