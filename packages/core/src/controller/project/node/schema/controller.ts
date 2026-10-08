import type { CoreControllerHost } from '../../../../types/host';
import { findDefinition, resolveJsonSchemaForDefinition } from '../../catalog/ops';

export class SchemaController {
  constructor(private readonly core: CoreControllerHost) {}

  resolveForOpenDefinition() {
    const definition = this.core.getSnapshot().openDefinition;
    if (!definition) return null;
    return resolveJsonSchemaForDefinition(this.core.getSnapshot().catalog, definition);
  }

  resolve(definitionUuid: string) {
    const located = findDefinition(this.core.getSnapshot().catalog, definitionUuid);
    if (!located) return null;
    return resolveJsonSchemaForDefinition(this.core.getSnapshot().catalog, located.definition);
  }
}
