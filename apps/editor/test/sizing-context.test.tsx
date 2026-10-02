/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, useSyncExternalStore } from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { validateCatalog, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { StyleInspector } from '../src/ui/sidebar/properties/style/StyleInspector.js';
import { gridDeclarations } from '../src/ui/sidebar/properties/layout/grid/edits.js';
import { shownAxis } from '../src/ui/sidebar/properties/layout/sizing.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(cleanup);
it('preserves custom expressions and maps CSS auto and fixed bounds without inventing modes', () => {
  expect(shownAxis('height', { mode: 'hug' }, { height: 'calc(100vh - 20px)' })).toEqual({
    value: undefined,
    customValue: 'calc(100vh - 20px)',
  });
  expect(shownAxis('height', undefined, { height: 'auto', 'min-height': '24px' }).value).toEqual({
    mode: 'auto',
    min: 24,
  });
  expect(shownAxis('height', { mode: 'hug', min: 40, max: 300 }, { height: 'auto' }).value).toEqual(
    { mode: 'auto', min: 40, max: 300 },
  );
  expect(shownAxis('width', undefined, { width: '240px', 'max-width': '80%' }).value).toEqual({
    mode: 'fixed',
    size: 240,
    max: { unit: '%', value: 80 },
  });
});
const breakpoints = [
  { id: 'phone', minWidth: 375 },
  { id: 'tablet', minWidth: 768 },
];
const master: DocumentFile = {
  version: 1,
  id: 'card-master',
  name: 'Card',
  kind: 'component',
  root: { id: 'root', type: 'frame', layout: { height: { mode: 'hug' } }, children: [] },
};
const file: DocumentFile = {
  version: 1,
  id: 'size-context',
  name: 'Sizes',
  kind: 'component',
  settings: { breakpoints },
  variants: [{ name: 'compact' }],
  root: {
    id: 'root',
    type: 'frame',
    style: { display: 'grid' },
    children: [{ id: 'card', type: 'instance', component: 'card-master' }],
  },
};
function Harness({ session }: { session: EditorSession }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return <StyleInspector session={session} snap={snap} node={snap.selectedNode!} />;
}
it.each([
  [false, false],
  [true, false],
  [false, true],
  [true, true],
])(
  'distinguishes Auto from Inherit for a Hug master (variant %s, viewport %s)',
  async (variant, viewport) => {
    const session = createEditorSession({
      documents: validateCatalog([file, master]),
      design: createProjectTemplateDocument(),
    });
    session.openAsset(file.id, 'root');
    session.selectNode('card');
    if (variant) session.setActiveVariant('compact');
    if (viewport) {
      session.setFocusViewport('tablet');
      session.setEditTarget('viewport');
    }
    const { container } = render(<Harness session={session} />);
    const height = () =>
      container.querySelector<HTMLSelectElement>('select[name="layout-height"]')!;
    expect(height()).toHaveValue('');
    const before = structuredClone(session.getSnapshot().document);
    await userEvent.setup().selectOptions(height(), 'auto');
    expect(height()).toHaveValue('auto');
    expect(
      gridDeclarations(session.getSnapshot(), 'card', viewport ? 'tablet' : null, breakpoints)
        .height,
    ).toBe('auto');
    expect(
      session
        .boardStores()
        .find((store) => store.getDocument().id === master.id)!
        .getNode('root'),
    ).toMatchObject({ layout: { height: { mode: 'hug' } } });
    expect(session.getSnapshot().document.nodes).toEqual(before.nodes);
    await userEvent.setup().selectOptions(height(), '');
    expect(height()).toHaveValue('');
    expect(session.getSnapshot().document).toEqual(before);
    await act(async () => session.undo());
    expect(height()).toHaveValue('auto');
    await act(async () => session.undo());
    expect(session.getSnapshot().document).toEqual(before);
  },
);

it('keeps manual CSS height separate and synchronizes edits with the guided size control', async () => {
  const native: DocumentFile = {
    ...file,
    root: { id: 'root', type: 'frame', style: { height: 'fit-content' }, children: [] },
  };
  const session = createEditorSession({
    documents: validateCatalog([native]),
    design: createProjectTemplateDocument(),
  });
  session.openAsset(file.id, 'root');
  const { container } = render(<Harness session={session} />);
  const height = container.querySelector<HTMLSelectElement>('select[name="layout-height"]')!;
  expect(height).toHaveValue('hug');
  expect(container.querySelector('[name="style-root-base-base-height"]')).toBeNull();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Manual CSS properties' }));
  const raw = container.querySelector<HTMLInputElement>('[name="style-root-base-base-height"]')!;
  expect(raw).toBeTruthy();
  fireEvent.change(raw, { target: { value: 'auto' } });
  fireEvent.blur(raw);
  expect(height).toHaveValue('auto');
  await userEvent.setup().selectOptions(height, 'hug');
  expect(
    container.querySelector<HTMLInputElement>('[name="style-root-base-base-height"]'),
  ).toHaveValue('fit-content');
});

it('replaces a legacy Hug height atomically while preserving width and unrelated layout', async () => {
  const native: DocumentFile = {
    ...file,
    root: {
      id: 'root',
      type: 'frame',
      layout: {
        direction: 'row',
        width: { mode: 'fixed', size: 240 },
        height: { mode: 'hug', min: 24 },
      },
      children: [],
    },
  };
  const session = createEditorSession({
    documents: validateCatalog([native]),
    design: createProjectTemplateDocument(),
  });
  session.openAsset(file.id, 'root');
  const { container } = render(<Harness session={session} />);
  const before = structuredClone(session.getSnapshot().document);
  await userEvent
    .setup()
    .selectOptions(
      container.querySelector<HTMLSelectElement>('select[name="layout-height"]')!,
      'auto',
    );
  expect(session.getSnapshot().document.nodes.root?.layout).toEqual({
    direction: 'row',
    width: { mode: 'fixed', size: 240 },
  });
  expect(gridDeclarations(session.getSnapshot(), 'root', null, breakpoints)).toMatchObject({
    height: 'auto',
    'min-height': '24px',
  });
  await act(async () => session.undo());
  expect(session.getSnapshot().document).toEqual(before);
});

it.each([false, true])(
  'Inherit removes both inline and style-block sizing in the current layer (variant %s)',
  async (variant) => {
    const native: DocumentFile = {
      ...file,
      root: { id: 'root', type: 'frame', style: { height: 'fit-content' }, children: [] },
      styles: { declarations: { height: '200px' } },
      variants: variant
        ? [
            {
              name: 'compact',
              overrides: {
                nodes: { root: { style: { height: 'auto' } } },
                styles: { declarations: { height: '240px' } },
              },
            },
          ]
        : file.variants,
    };
    const session = createEditorSession({
      documents: validateCatalog([native]),
      design: createProjectTemplateDocument(),
    });
    session.openAsset(file.id, 'root');
    if (variant) session.setActiveVariant('compact');
    const { container } = render(<Harness session={session} />);
    const before = structuredClone(session.getSnapshot().document);
    await userEvent
      .setup()
      .selectOptions(
        container.querySelector<HTMLSelectElement>('select[name="layout-height"]')!,
        '',
      );
    expect(container.querySelector('select[name="layout-height"]')).toHaveValue('');
    if (variant) {
      expect(session.getSnapshot().document.nodes).toEqual(before.nodes);
      expect(session.getSnapshot().document.styles).toEqual(before.styles);
      expect(gridDeclarations(session.getSnapshot(), 'root', null, breakpoints).height).toBe(
        'fit-content',
      );
    } else
      expect(
        gridDeclarations(session.getSnapshot(), 'root', null, breakpoints).height,
      ).toBeUndefined();
    await act(async () => session.undo());
    expect(session.getSnapshot().document).toEqual(before);
  },
);
