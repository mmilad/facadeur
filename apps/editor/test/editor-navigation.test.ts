import { describe, expect, it } from 'vitest';
import {
  hasEditorNavigationSelection,
  parseEditorNavigation,
  writeEditorNavigation,
} from '../src/domain/navigation/editor-navigation';
import { exampleIds as fixtureIds } from '@facadeur/examples';

const isSurface = (value: string) => ['editor', 'schema', 'preview', 'colors'].includes(value);

describe('editor navigation URL helpers', () => {
  it('parses supported values and treats default variants as the base document', () => {
    const state = parseEditorNavigation(
      new URLSearchParams(
        "document=card&variant=default&layer=hero&viewport=" + fixtureIds.catalog.breakpoints.desktop + "&surface=schema",
      ),
      { isSurface },
    );
    expect(state).toEqual({
      documentId: 'card',
      layerId: 'hero',
      viewportId: fixtureIds.catalog.breakpoints.desktop,
      surface: 'schema',
    });
    expect(hasEditorNavigationSelection(state)).toBe(true);
  });

  it('falls back safely and preserves unrelated query parameters when writing', () => {
    const parsed = parseEditorNavigation(new URLSearchParams('surface=unknown&document='), {
      isSurface,
    });
    expect(parsed.surface).toBe('editor');
    const query = writeEditorNavigation(new URLSearchParams('tenant=acme&surface=preview'), {
      documentId: 'card',
      surface: 'editor',
    });
    expect(query.toString()).toBe('tenant=acme&document=card');
  });

  it('omits cleared selections and uses the requested surface', () => {
    const query = writeEditorNavigation(new URLSearchParams('document=old&layer=old'), {
      surface: 'preview',
    });
    expect(query.toString()).toBe('surface=preview');
    expect(hasEditorNavigationSelection(parseEditorNavigation(query, { isSurface }))).toBe(false);
  });
});
