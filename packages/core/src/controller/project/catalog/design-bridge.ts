import type { ProjectCatalog } from '@facadeur/domain';
import type { FlatDocument } from '../../../document/flat';
import { defaultBreakpoints } from '../../../schema/document';

const DESIGN_DOC_ID = 'catalog-design';

/** Working flat design slice backed by {@link ProjectCatalog} token/font/breakpoint fields. */
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
    root: { id: 'root', type: 'frame', name: 'Design' },
    nodes: { root: { id: 'root', type: 'frame', name: 'Design' } },
  };
  if (catalog.fonts?.length) {
    doc.fonts = catalog.fonts.map((font) => ({
      ...font,
      styles: font.styles ? [...font.styles] : undefined,
      weights: [...font.weights],
      fallbacks: [...font.fallbacks],
    }));
  }
  return doc;
}

export function mergeDesignSliceIntoCatalog(
  catalog: ProjectCatalog,
  slice: FlatDocument,
): ProjectCatalog {
  return {
    ...catalog,
    tokens: slice.tokens,
    ...(slice.fonts?.length ? { fonts: slice.fonts } : {}),
    globalStyles: {
      ...(catalog.globalStyles ?? {}),
      breakpoints: slice.settings?.breakpoints,
    },
  };
}
