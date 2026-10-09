/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EditorSession, EditorSnapshot } from '../src/domain/session';
import { PreviewDataStage } from '../src/ui/stage/PreviewDataStage';
import { tokenRef as fixtureTokenRef } from '@facadeur/examples';

function snapshot(overrides: Partial<EditorSnapshot> = {}): EditorSnapshot {
  const document = {
    version: 1,
    id: 'preview-stage',
    name: 'Preview stage',
    kind: 'component' as const,
    fields: [
      { name: 'background', type: 'text' as const },
      { name: 'label', type: 'text' as const, required: true },
      { name: 'enabled', type: 'boolean' as const },
      { name: 'items', type: 'array' as const },
    ],
    previewData: { fields: { background: fixtureTokenRef(testUuid29), label: 'Base label' } },
    variantLabels: { default: 'Base' },
    variants: [],
    settings: {},
    tokens: {},
    fonts: [],
    nodes: { root: { id: 'root', type: 'frame' as const, children: [] } },
    rootId: 'root',
  };
  return {
    document,
    documentScopeFields: document.fields,
    activeVariantName: 'compact',
    ...overrides,
  } as EditorSnapshot;
}

describe('PreviewDataStage', () => {
  afterEach(() => cleanup());

  it('does not write when opened and keeps raw values including unknown tokens', () => {
    const execute = vi.fn();
    const session = { execute } as unknown as EditorSession;
    render(<PreviewDataStage session={session} snap={snapshot()} />);

    expect(screen.getByRole('textbox', { name: 'Background' })).toHaveValue(fixtureTokenRef(testUuid29));
    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('Base label');
    expect(execute).not.toHaveBeenCalled();
  });

  it('shows exposed component fields that are absent from the document field declarations', () => {
    const execute = vi.fn();
    const session = { execute } as unknown as EditorSession;
    const snap = snapshot({
      document: {
        ...snapshot().document,
        fields: [{ name: 'label', type: 'text' }],
      },
      documentScopeFields: [
        { name: 'label', type: 'text' },
        { name: 'value', type: 'text' },
        { name: 'placeholder', type: 'text' },
        { name: 'name', type: 'text' },
        { name: 'disabled', type: 'boolean' },
      ],
    });

    render(<PreviewDataStage session={session} snap={snap} />);

    expect(screen.getByRole('textbox', { name: 'Label' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Value' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Placeholder' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Disabled' })).toBeInTheDocument();
  });

  it('writes only the changed field into the active variant', async () => {
    const user = userEvent.setup();
    const execute = vi.fn();
    const session = { execute } as unknown as EditorSession;
    render(<PreviewDataStage session={session} snap={snapshot()} />);

    const label = screen.getByRole('textbox', { name: 'Label' });
    await user.clear(label);
    await user.type(label, 'Compact label');
    await user.tab();

    expect(execute).toHaveBeenCalledWith({
      type: 'setPreviewData',
      previewData: {
        fields: { background: fixtureTokenRef(testUuid29), label: 'Base label' },
        variants: { compact: { label: 'Compact label' } },
      },
    });
  });

  it('labels inherited values and resets a local override to the base label', () => {
    const execute = vi.fn();
    const session = { execute } as unknown as EditorSession;
    render(
      <PreviewDataStage
        session={session}
        snap={snapshot({
          document: {
            ...snapshot().document,
            previewData: {
              fields: { background: fixtureTokenRef(testUuid29), label: 'Base label' },
              variants: { compact: { label: 'Compact label' } },
            },
          },
        })}
      />,
    );

    expect(screen.getByLabelText('Variant override · Required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset to Base' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Base' }));
    expect(execute).toHaveBeenCalledWith({
      type: 'setPreviewData',
      previewData: { fields: { background: fixtureTokenRef(testUuid29), label: 'Base label' } },
    });
  });

  it('labels inherited and missing values distinctly, and clears a base value explicitly', () => {
    const inheritedExecute = vi.fn();
    const inheritedSession = { execute: inheritedExecute } as unknown as EditorSession;
    render(<PreviewDataStage session={inheritedSession} snap={snapshot()} />);
    expect(screen.getAllByLabelText(/^Inherited from Base/)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Reset to Base' })).toBeNull();
    cleanup();

    const baseExecute = vi.fn();
    const baseSession = { execute: baseExecute } as unknown as EditorSession;
    render(
      <PreviewDataStage
        session={baseSession}
        snap={snapshot({
          activeVariantName: null,
          document: {
            ...snapshot().document,
            previewData: { fields: { background: fixtureTokenRef(testUuid29) } },
          },
        })}
      />,
    );
    expect(screen.getAllByLabelText(/^Missing preview value/)).toHaveLength(3);
    const missingLabelField = screen
      .getByRole('textbox', { name: 'Label' })
      .closest<HTMLElement>('.eu-field');
    expect(missingLabelField).not.toBeNull();
    expect(
      within(missingLabelField!).queryByRole('button', { name: 'Clear preview value' }),
    ).toBeNull();
    cleanup();

    render(<PreviewDataStage session={baseSession} snap={snapshot({ activeVariantName: null })} />);
    const baseLabelField = screen
      .getByRole('textbox', { name: 'Label' })
      .closest<HTMLElement>('.eu-field');
    expect(baseLabelField).not.toBeNull();
    fireEvent.click(within(baseLabelField!).getByRole('button', { name: 'Clear preview value' }));
    expect(baseExecute).toHaveBeenCalledWith({
      type: 'setPreviewData',
      previewData: { fields: { background: fixtureTokenRef(testUuid29) } },
    });
  });

  it('does not save malformed JSON drafts', () => {
    const execute = vi.fn();
    const setNotice = vi.fn();
    const session = { execute, setNotice } as unknown as EditorSession;
    render(<PreviewDataStage session={session} snap={snapshot({ activeVariantName: null })} />);

    const items = screen.getByRole('textbox', { name: 'Items' });
    fireEvent.change(items, { target: { value: '{' } });
    fireEvent.blur(items);

    expect(execute).not.toHaveBeenCalled();
    expect(setNotice).toHaveBeenCalledWith('items must be valid JSON', 'error');
  });

  it('keeps schema-invalid JSON local and saves a corrected draft as a sparse variant override', () => {
    const execute = vi.fn();
    const setNotice = vi.fn();
    const session = { execute, setNotice } as unknown as EditorSession;
    const snap = snapshot();
    snap.document.fields = [
      {
        name: 'items',
        type: 'array',
        items: {
          type: 'object',
          fields: [{ name: 'count', type: 'number', required: true }],
        },
      },
    ];
    snap.documentScopeFields = snap.document.fields;
    render(<PreviewDataStage session={session} snap={snap} />);
    const items = screen.getByRole('textbox', { name: 'Items' });
    fireEvent.change(items, { target: { value: '[{"count":"wrong"}]' } });
    fireEvent.blur(items);
    expect(execute).not.toHaveBeenCalled();
    expect(setNotice).toHaveBeenCalledWith(expect.stringMatching(/expects.*number/), 'error');
    expect(items).toHaveValue('[{"count":"wrong"}]');

    fireEvent.change(items, { target: { value: '[{"count":0}]' } });
    fireEvent.blur(items);
    expect(execute).toHaveBeenCalledExactlyOnceWith({
      type: 'setPreviewData',
      previewData: {
        fields: { background: fixtureTokenRef(testUuid29), label: 'Base label' },
        variants: { compact: { items: [{ count: 0 }] } },
      },
    });
  });
});
