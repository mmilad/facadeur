import type { FlatDocument } from '../../document/flat.js';
import type { TokenTree } from '../style/tokens/types.js';
import type { SchemaResolverContext } from '../validation/types.js';

/** Shared, live read context supplied by the owning project. */
export interface DocumentControllerContext extends SchemaResolverContext {
  documents: ReadonlyMap<string, FlatDocument>;
  globalTokens?: TokenTree;
}
