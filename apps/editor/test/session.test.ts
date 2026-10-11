import { describe, expect, it, vi } from 'vitest';
import { createExampleCatalog } from '@facadeur/examples';
import { createEditorSession } from '../src/domain/session';

describe('catalog editor session', () => {
  it('filters assets by workspace and opens a selected catalog definition', () => {
    const catalog = createExampleCatalog();
    const session = createEditorSession({ projectCatalog: catalog });
    const firstPage = Object.values(catalog.pages)[0]!;
    const firstAtom = Object.values(catalog.atoms)[0]!;

    session.openAsset(firstPage.uuid);
    expect(session.getSnapshot().workspace).toBe('page');
    expect(session.getSnapshot().assets.every((asset) => asset.kind === 'page')).toBe(true);

    session.setWorkspace('atom');
    expect(session.getSnapshot().assets.length).toBeGreaterThan(0);
    expect(session.getSnapshot().assets.every((asset) => asset.kind === 'atom')).toBe(true);
    expect(session.getSnapshot().openId).toBe(firstPage.uuid);

    session.openAsset(firstAtom.uuid);
    expect(session.getSnapshot().openId).toBe(firstAtom.uuid);
    expect(session.getSnapshot().workspace).toBe('atom');
    session.destroy();
  });

  it('resets zoom through the registered stage handler', () => {
    const session = createEditorSession({ projectCatalog: createExampleCatalog() });
    const zoom = vi.fn();

    session.setZoomByHandler(zoom);
    session.setZoom(1.1);
    expect(session.getSnapshot().zoomLabel).toBe('110%');

    session.resetZoom();
    expect(zoom).toHaveBeenLastCalledWith(1);
    session.destroy();
  });
});
