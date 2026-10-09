/** @vitest-environment jsdom */
import { act, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { toFlat, type DocumentFile } from '@facadeur/core';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { StyleInspector } from '../src/ui/sidebar/properties/style/StyleInspector';
import { Combobox } from '../src/ui/form/index';
import { TokenValueControl } from '../src/ui/controls/fields/TokenValueControl';
import {
  TokenPreviewProvider,
  TokenValueLabelProvider,
  useTokenLabel,
  useTokenValueLabel,
} from '../src/ui/controls/fields/TokenPreviewContext';
import { expandExampleCatalog } from './fixtures/example-catalog';
import { tokenRef as fixtureTokenRef } from '@facadeur/examples';

function Labels({ reference }: { reference: string }) {
  return (
    <>
      <output data-label="picker">{useTokenLabel()(reference)}</output>
      <output data-label="value">{useTokenValueLabel()(reference)}</output>
    </>
  );
}

function ScopedControls({ reference }: { reference: string }) {
  const pickerLabel = useTokenLabel();
  const valueLabel = useTokenValueLabel();
  return (
    <>
      <TokenValueControl
        name="inherited-color"
        label="Color"
        value={reference}
        tokens={[reference]}
        color
        onCommit={() => {}}
      />
      <Combobox
        name="inherited-spacing"
        value={reference}
        currentLabel={valueLabel(reference)}
        options={[{ value: reference, label: pickerLabel(reference) }]}
        onCommit={() => {}}
      />
    </>
  );
}

function SessionStyleInspector({ session }: { session: EditorSession }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return snap.selectedNode ? (
    <StyleInspector session={session} snap={snap} node={snap.selectedNode} />
  ) : null;
}

function mount(element: React.ReactNode) {
  const host = window.document.createElement('div');
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, unmount: () => act(() => root.unmount()) };
}

describe('instance token label ownership', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  it('scopes an inherited master value label while keeping picker labels on the owner', () => {
    const design = toFlat({
      version: 1,
      id: 'design',
      name: 'Design',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      tokens: {
        color: {
          brand: {
            $type: 'color',
            $value: '#123456',
            $extensions: { facadeur: { label: 'Global brand' } },
          },
          neutral: { $type: 'color', $value: '#eeeeee' },
        },
      },
    } as DocumentFile);
    const owner = toFlat({
      version: 1,
      id: 'owner',
      name: 'Owner',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      componentTokens: {
        brand: { path: 'color.brand', type: 'color', value: '#abcdef', label: 'Owner brand' },
      },
    } as DocumentFile);
    const master = toFlat({
      version: 1,
      id: 'master',
      name: 'Master',
      kind: 'atom',
      root: { id: 'root', type: 'frame' },
      componentTokens: {
        brand: { path: 'color.brand', type: 'color', value: '#fedcba', label: 'Master brand' },
      },
    } as DocumentFile);
    const app = mount(
      <TokenPreviewProvider design={design} document={owner} breakpointId={null}>
        <Labels reference={fixtureTokenRef(testUuid27)} />
        <TokenValueLabelProvider design={design} document={master}>
          <Labels reference={fixtureTokenRef(testUuid27)} />
          <ScopedControls reference={fixtureTokenRef(testUuid27)} />
        </TokenValueLabelProvider>
      </TokenPreviewProvider>,
    );
    const values = [...app.host.querySelectorAll('[data-label="value"]')].map(
      (node) => node.textContent,
    );
    const pickers = [...app.host.querySelectorAll('[data-label="picker"]')].map(
      (node) => node.textContent,
    );
    expect(values).toEqual(['Owner brand', 'Master brand']);
    expect(pickers).toEqual(['Owner brand', 'Owner brand']);
    expect(app.host.querySelector('button[name="inherited-color"]')?.textContent).toContain(
      'Master brand',
    );
    expect(app.host.querySelector('button[name="inherited-spacing"]')?.textContent).toBe(
      'Master brand',
    );
    act(() =>
      (app.host.querySelector('button[name="inherited-spacing"]') as HTMLButtonElement).click(),
    );
    expect(document.querySelector('.eu-combobox-option')?.textContent).toContain('Owner brand');
    app.unmount();
  });

  it('keeps global design labels authoritative over legacy document token labels', () => {
    const design = toFlat({
      version: 1,
      id: 'design',
      name: 'Design',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      tokens: {
        color: {
          brand: {
            $type: 'color',
            $value: '#123456',
            $extensions: { facadeur: { label: 'Global brand' } },
          },
          neutral: { $type: 'color', $value: '#dddddd' },
        },
      },
    } as DocumentFile);
    const legacyDocument = toFlat({
      version: 1,
      id: 'legacy',
      name: 'Legacy',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      tokens: {
        color: {
          brand: {
            $type: 'color',
            $value: '#abcdef',
            $extensions: { facadeur: { label: 'Legacy brand' } },
          },
          neutral: {
            $type: 'color',
            $value: '#abcdef',
            $extensions: { facadeur: { label: 'Stale neutral' } },
          },
        },
      },
    } as DocumentFile);
    const app = mount(
      <TokenPreviewProvider design={design} document={legacyDocument} breakpointId={null}>
        <Labels reference={fixtureTokenRef(testUuid27)} />
        <Labels reference={fixtureTokenRef(testUuid28)} />
      </TokenPreviewProvider>,
    );
    expect(
      [...app.host.querySelectorAll('[data-label="value"]')].map((node) => node.textContent),
    ).toEqual(['Global brand', 'Neutral']);
    expect(
      [...app.host.querySelectorAll('[data-label="picker"]')].map((node) => node.textContent),
    ).toEqual(['Global brand', 'Neutral']);
    app.unmount();
  });

  it('uses the master label for inherited CSS and the owner label after a local override', () => {
    const design: DocumentFile = {
      version: 1,
      id: 'design',
      name: 'Design',
      kind: 'component',
      root: { id: 'design-root', type: 'frame' },
      tokens: {
        color: {
          brand: {
            $type: 'color',
            $value: '#123456',
            $extensions: { facadeur: { label: 'Global brand' } },
          },
        },
      },
    };
    const master: DocumentFile = {
      version: 1,
      id: 'master',
      name: 'Master',
      kind: 'atom',
      styles: { declarations: { color: fixtureTokenRef(testUuid27) } },
      root: { id: 'master-root', type: 'text', tag: 'input' },
      componentTokens: {
        masterBrand: {
          path: 'color.brand',
          type: 'color',
          value: '#fedcba',
          label: 'Master brand',
        },
      },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'owner',
      name: 'Owner',
      kind: 'component',
      root: {
        id: 'owner-root',
        type: 'frame',
        children: [{ id: 'use', type: 'instance', component: 'master' }],
      },
      componentTokens: {
        ownerBrand: {
          path: 'color.brand',
          type: 'color',
          value: '#abcdef',
          label: 'Owner brand',
        },
      },
    };
    const session = createEditorSession({
      documents: expandExampleCatalog([master, owner]),
      design,
    });
    session.openAsset('owner');
    session.selectNode('use');
    const app = mount(<SessionStyleInspector session={session} />);
    act(() => {
      [...app.host.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Manual CSS properties'))
        ?.click();
    });
    const colorValue = () => app.host.querySelector('.token-value-reference')?.textContent;
    expect(colorValue()).toContain('Master brand');
    act(() =>
      session.execute({
        type: 'setStyleBlock',
        style: { children: { use: { declarations: { color: fixtureTokenRef(testUuid27) } } } },
      }),
    );
    expect(colorValue()).toContain('Owner brand');
    app.unmount();
  });
});
