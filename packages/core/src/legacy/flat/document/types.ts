import type { FlatDocument } from '../../../document/flat';
import type { TokenTree } from '../../../controller/style/tokens/types';
import type { SchemaResolverContext } from '../validation/types';

/** Shared, live read context supplied by the owning project. */
export interface DocumentControllerContext extends SchemaResolverContext {
  documents: ReadonlyMap<string, FlatDocument>;
  globalTokens?: TokenTree;
}
