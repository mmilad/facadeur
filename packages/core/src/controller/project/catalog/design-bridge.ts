import type { ProjectCatalog } from '@facadeur/domain';
import type { FlatDocument } from '../../../document/flat';
import { defaultBreakpoints } from '../../../schema/document';

const DESIGN_DOC_ID = 'catalog-design';

/** Working flat design slice backed by {@link ProjectCatalog} token/breakpoint fields. */
export function designSliceFromCatalog(catalog: ProjectCatalog): FlatDocument {
  const doc: FlatDocument = {
    version: 1,
    id: DESIGN_DOC_ID,
    name: 'Design',
    kind: 'design',
    tokens: structuredClone(catalog.tokens ?? {}) as FlatDocument['tokens'],
    settings: {
      breakpoints: [...(catalog.globalStyles?.breakpoints ?? defaultBreakpoints)],
    },
    nodes: { root: { id: 'root', type: 'frame', name: 'Design', children: [] } },
    rootId: 'root',
    fields: [],
    variants: [],
  };
  return doc;
}

export function mergeDesignSliceIntoCatalog(
  catalog: ProjectCatalog,
  slice: FlatDocument,
): ProjectCatalog {
  return {
    ...catalog,
    tokens: slice.tokens,
    globalStyles: {
      ...(catalog.globalStyles ?? {}),
      breakpoints: slice.settings?.breakpoints,
    },
  };
}
