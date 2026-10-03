// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session';
import { editorBreakpoints, viewportEditContext } from '../src/domain/viewport/viewport-edit';
import { PropertiesPanel } from '../src/ui/sidebar/properties/PropertiesPanel';
import { RightRail } from '../src/ui/sidebar/properties/RightRail';

const documents: DocumentFile[] = [
  {
    version: 1,
    id: 'input',
    name: 'Input',
    kind: 'atom',
    styles: { declarations: { opacity: '0.8' } },
    fields: [
      { name: 'label', type: 'text', default: 'Base label' },
      { name: 'disabled', type: 'boolean', default: false },
      { name: 'value', type: 'text' },
    ],
    root: {
      id: 'root',
      type: 'frame',
      children: [{ id: 'label', type: 'text', bindings: [{ field: 'label', target: 'text' }] }],
    },
  },
  {
    version: 1,
    id: 'form',
    name: 'Form',
    kind: 'component',
    styles: { children: { email: { declarations: { opacity: '0.65' } } } },
    root: {
      id: 'root',
      type: 'frame',
      children: [
        { id: 'email', type: 'instance', component: 'input', fields: { label: 'Work email' } },
      ],
    },
  },
  {
    version: 1,
    id: 'section',
    name: 'Section',
    kind: 'section',
    settings: {
      breakpoints: [
        { id: 'mobile', minWidth: 375 },
        { id: 'tablet', minWidth: 768 },
      ],
    },
    root: {
      id: 'root',
      type: 'frame',
      children: [
        { id: 'first', type: 'instance', component: 'form' },
        { id: 'second', type: 'instance', component: 'form' },
      ],
    },
  },
];

afterEach(cleanup);
function setup(
  address = 'root/first/email',
  options: { variants?: boolean; viewportBar?: boolean } = {},
) {
  const testDocuments = structuredClone(documents);
  if (options.variants) {
    testDocuments[2]!.kind = 'component';
    testDocuments[2]!.variants = [{ name: 'compact' }];
  }
  const session = createEditorSession({
    documents: testDocuments,
    design: createProjectTemplateDocument(),
  });
  session.openAsset('section');
  session.selectRendered(address);
  const view = options.viewportBar
    ? render(<RightRail session={session} snap={session.getSnapshot()} surface="editor" />)
    : render(<PropertiesPanel session={session} snap={session.getSnapshot()} />);
  const update = () => {
    const snap = session.getSnapshot();
    view.rerender(
      options.viewportBar ? (
        <RightRail session={session} snap={snap} surface="editor" />
      ) : (
        <PropertiesPanel session={session} snap={snap} />
      ),
    );
  };
  return { session, update };
}

describe('nested field inspector', () => {
  it('shows inherited fields and saves only a local override, with reset and undo', () => {
    const { session, update } = setup();
    const masterBefore = session.boardDocuments().find((doc) => doc.id === 'form');
    expect(screen.getByTestId('nested-fields-panel')).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Style' })).toBeVisible();
    expect(screen.queryByRole('tablist', { name: 'Component variants' })).not.toBeInTheDocument();
    const label = screen.getByRole('textbox', { name: 'Label' });
    expect(label).toHaveValue('Work email');
    fireEvent.change(label, { target: { value: 'Personal email' } });
    fireEvent.blur(label);
    update();
    expect(session.getSnapshot().document.nodes.first).toMatchObject({
      childFields: { email: { label: 'Personal email' } },
    });
    expect(session.getSnapshot().document.nodes.second).not.toHaveProperty('childFields');
    expect(session.boardDocuments().find((doc) => doc.id === 'form')).toEqual(masterBefore);
    expect(screen.getByText('Local override')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Reset Label' }));
    update();
    expect(session.getSnapshot().document.nodes.first).not.toHaveProperty('childFields');
    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('Work email');
    act(() => session.undo());
    update();
    expect(session.getSnapshot().nestedSelection).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('Personal email');
    act(() => session.redo());
    update();
    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('Work email');
  });

  it('edits only the nested instance style path with reset, owner variants, breakpoints, and undo', () => {
    const { session, update } = setup('root/first/email', { variants: true, viewportBar: true });
    act(() => session.setActiveVariant(null));
    update();
    const masterBefore = session.boardDocuments().find((doc) => doc.id === 'input');
    expect(screen.getByRole('group', { name: 'Style edit target' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Style' }));
    const opacity = screen.getByRole('textbox', { name: 'Opacity' });
    expect(opacity).toHaveValue('0.65');
    fireEvent.change(opacity, { target: { value: '0.5' } });
    fireEvent.blur(opacity);
    update();
    expect(
      session.getSnapshot().document.styles?.children?.['first/email']?.declarations?.opacity,
    ).toBe('0.5');
    expect(session.getSnapshot().document.styles?.children?.second).toBeUndefined();
    expect(session.boardDocuments().find((doc) => doc.id === 'input')).toEqual(masterBefore);

    act(() => session.undo());
    update();
    expect(session.getSnapshot().document.styles?.children?.['first/email']).toBeUndefined();
    expect(session.getSnapshot().nestedSelection).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'Opacity' })).toHaveValue('0.65');
    act(() => session.redo());
    update();
    expect(screen.getByRole('textbox', { name: 'Opacity' })).toHaveValue('0.5');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    update();
    expect(session.getSnapshot().document.styles?.children?.['first/email']).toBeUndefined();

    act(() => session.setActiveVariant('compact'));
    update();
    fireEvent.change(screen.getByRole('textbox', { name: 'Opacity' }), {
      target: { value: '0.4' },
    });
    fireEvent.blur(screen.getByRole('textbox', { name: 'Opacity' }));
    update();
    expect(
      session.getSnapshot().document.variantPresets?.find((preset) => preset.name === 'compact')
        ?.overrides?.styles?.children?.['first/email']?.declarations?.opacity,
    ).toBe('0.4');
    expect(session.getSnapshot().document.styles?.children?.['first/email']).toBeUndefined();

    fireEvent.change(screen.getByRole('combobox', { name: 'State' }), {
      target: { value: 'hover' },
    });
    const tablet = editorBreakpoints(
      session.getSnapshot().document,
      session.getSnapshot().design,
    ).find((breakpoint) => breakpoint.minWidth === 768);
    if (!tablet) throw new Error('Expected a tablet breakpoint');
    act(() => {
      session.setFocusViewport(tablet.id);
    });
    update();
    fireEvent.click(screen.getByRole('button', { name: /768/ }));
    update();
    expect(
      viewportEditContext({
        breakpoints: editorBreakpoints(
          session.getSnapshot().document,
          session.getSnapshot().design,
        ),
        focusId: session.getSnapshot().focusViewportId,
        editTarget: session.getSnapshot().editTarget,
      }).writingBreakpointId,
    ).toBe(tablet.id);
    fireEvent.change(screen.getByRole('textbox', { name: 'Opacity' }), {
      target: { value: '0.2' },
    });
    fireEvent.blur(screen.getByRole('textbox', { name: 'Opacity' }));
    update();
    expect(
      session.getSnapshot().document.variantPresets?.find((preset) => preset.name === 'compact')
        ?.overrides?.styles?.children?.['first/email']?.breakpoints?.[tablet.id]?.states?.hover
        ?.opacity,
    ).toBe('0.2');
  });

  it('routes a bound leaf to its instance field and can store an explicit empty string', () => {
    const { session, update } = setup('root/first/email/label');
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    fireEvent.change(screen.getByRole('textbox', { name: 'Label' }), { target: { value: '' } });
    fireEvent.blur(screen.getByRole('textbox', { name: 'Label' }));
    update();
    expect(session.getSnapshot().document.nodes.first).toMatchObject({
      childFields: { email: { label: '' } },
    });
    expect(screen.getByRole('button', { name: 'Reset Label' })).toBeVisible();
  });
  it('edits a field bound to a direct instance leaf through the existing fields map', () => {
    const session = createEditorSession({ documents, design: createProjectTemplateDocument() });
    session.openAsset('form');
    session.selectRendered('root/email/label');
    const view = render(<PropertiesPanel session={session} snap={session.getSnapshot()} />);
    const label = screen.getByRole('textbox', { name: 'Label' });
    fireEvent.change(label, { target: { value: 'Direct local label' } });
    fireEvent.blur(label);
    view.rerender(<PropertiesPanel session={session} snap={session.getSnapshot()} />);
    expect(session.getSnapshot().document.nodes.email).toMatchObject({
      fields: { label: 'Direct local label' },
    });
    expect(session.getSnapshot().document.nodes.email).not.toHaveProperty('childFields');
  });

  it('shows data-bound values as read-only instead of creating ineffective overrides', () => {
    const boundDocuments = structuredClone(documents);
    const form = boundDocuments[1]!;
    form.fields = [{ name: 'title', type: 'text', default: 'Bound label' }];
    if (form.root.type !== 'frame') throw new Error('Expected frame');
    const email = form.root.children?.[0];
    if (email?.type !== 'instance') throw new Error('Expected instance');
    delete email.fields;
    email.fieldBindings = { label: 'title' };
    const section = boundDocuments[2]!;
    if (section.root.type !== 'frame') throw new Error('Expected section frame');
    const host = section.root.children?.[0];
    if (host?.type !== 'instance') throw new Error('Expected host instance');
    host.childFields = { email: { label: 'Dormant local label' } };
    const session = createEditorSession({
      documents: boundDocuments,
      design: createProjectTemplateDocument(),
    });
    session.openAsset('section');
    session.selectRendered('root/first/email');
    render(<PropertiesPanel session={session} snap={session.getSnapshot()} />);
    const label = screen.getByRole('textbox', { name: /Label .* bound to title/ });
    expect(label).toBeDisabled();
    expect(label).toHaveValue('Bound label');
    act(() => session.setNestedField('label', 'Ignored'));
    expect(session.getSnapshot().document.nodes.first).toMatchObject({
      childFields: { email: { label: 'Dormant local label' } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Label' }));
    expect(session.getSnapshot().document.nodes.first).not.toHaveProperty('childFields');
  });
});
