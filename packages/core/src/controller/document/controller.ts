import { DocumentError } from '../../document/errors.js';
import type { FieldDefinition } from '../../schema/document.js';
import { localContractFieldsFor } from '../validation/schema-use.js';
import { publicFieldsFor } from '../validation/catalog-exposed.js';
import type { DocumentControllerContext } from './types.js';

/** A live, read-only view over one project document and its resolved contract. */
export class DocumentController {
  constructor(
    readonly id: string,
    private readonly context: DocumentControllerContext,
  ) {}

  get manifest() {
    const document = this.context.documents.get(this.id);
    if (!document) throw new DocumentError('unknown-document', `Unknown document "${this.id}"`);
    return structuredClone(document);
  }

  get kind() {
    return this.manifest.kind;
  }

  get group() {
    return this.manifest.group;
  }

  get root() {
    return this.manifest.nodes[this.manifest.rootId];
  }

  get nodes() {
    return this.manifest.nodes;
  }

  /** Authored style definition; token and variant evaluation belongs to the style runtime. */
  get styles() {
    return this.manifest.styles;
  }

  get previewData() {
    return this.manifest.previewData;
  }

  get fields(): ReadonlyMap<string, FieldDefinition> {
    return publicFieldsFor(this.manifest, this.context);
  }

  get localFields(): ReadonlyMap<string, FieldDefinition> {
    return localContractFieldsFor(this.manifest, this.context.schemaCatalog);
  }

  get globalTokens() {
    return structuredClone(this.context.globalTokens);
  }
}
