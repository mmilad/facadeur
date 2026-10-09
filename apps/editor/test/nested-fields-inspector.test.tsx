// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session';
import { editorBreakpoints, viewportEditContext } from '../src/domain/viewport/viewport-edit';
import { PropertiesPanel } from '../src/ui/sidebar/properties/PropertiesPanel';
import { RightRail } from '../src/ui/sidebar/properties/RightRail';
import { exampleIds as fixtureIds } from '@facadeur/examples';

const documents: DocumentFile[] = [
  {
    version: 1,
    id: 'input',
    name: 'Input',
    kind: 'component',
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
        { uuid: fixtureIds.catalog.breakpoints.phone, label: 'Phone', minWidth: 375 },
        { uuid: fixtureIds.catalog.breakpoints.tablet, label: 'Tablet', minWidth: 768 },
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

describe.skip('nested field inspector (legacy sidebar disabled)', () => {
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
      session.setFocusViewport(tablet.uuid);
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
    ).toBe(tablet.uuid);
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

  it('lets an instance disable automatic field forwarding and retains manual bindings', async () => {
    const testDocuments = structuredClone(documents);
    const form = testDocuments[1]!;
    form.fields = [{ name: 'title', type: 'text' }];
    if (form.root.type !== 'frame') throw new Error('Expected frame');
    const email = form.root.children?.[0];
    if (email?.type !== 'instance') throw new Error('Expected instance');
    email.fieldBindings = { label: 'title' };

    const session = createEditorSession({
      documents: testDocuments,
      design: createProjectTemplateDocument(),
    });
    session.openAsset('form');
    session.selectNode('email');
    const view = render(<PropertiesPanel session={session} snap={session.getSnapshot()} />);

    const forwardToggle = screen.getByRole('switch', {
      name: 'Forward matching fields automatically',
    });
    expect(forwardToggle).toBeChecked();
    expect(screen.queryByRole('combobox', { name: 'Label' })).not.toBeInTheDocument();

    await userEvent.setup().click(forwardToggle);
    view.rerender(<PropertiesPanel session={session} snap={session.getSnapshot()} />);

    expect(session.getSnapshot().document.nodes.email).toMatchObject({
      forwardFields: false,
      fieldBindings: { label: 'title' },
    });
    expect(
      view.container.querySelector<HTMLSelectElement>('select[name="field-binding-label"]'),
    ).toHaveValue('title');
  });

  it('shows local field values as editable preview overrides over data bindings', () => {
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
    expect(label).toBeEnabled();
    expect(label).toHaveValue('Dormant local label');
    act(() => session.setNestedField('label', 'Local preview'));
    expect(session.getSnapshot().document.nodes.first).toMatchObject({
      childFields: { email: { label: 'Local preview' } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Label' }));
    expect(session.getSnapshot().document.nodes.first).not.toHaveProperty('childFields');
  });

  it('offers outer typed item fields as parent scope across a drilled component boundary', async () => {
    const nestedTarget: DocumentFile = {
      version: 1,
      id: 'nested-target',
      name: 'Nested target',
      kind: 'component',
      fields: [{ name: 'innerTitle', type: 'text' }],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const inner: DocumentFile = {
      version: 1,
      id: 'inner-scope',
      name: 'Inner scope',
      kind: 'component',
      fields: [{ name: 'outerTitle', type: 'text' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'inner-repeat',
            type: 'repeater',
            children: [
              {
                id: 'inner-switch',
                type: 'switch',
                children: [
                  { id: 'nested-placement', type: 'instance', component: 'nested-target' },
                ],
              },
            ],
          },
        ],
      },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'scope-owner',
      name: 'Scope owner',
      kind: 'section',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'outer-repeat',
            type: 'repeater',
            children: [
              {
                id: 'outer-switch',
                type: 'switch',
                children: [{ id: 'inner-placement', type: 'instance', component: 'inner-scope' }],
              },
            ],
          },
        ],
      },
    };
    const session = createEditorSession({
      documents: [owner, inner, nestedTarget],
      design: createProjectTemplateDocument(),
    });
    session.openAsset('scope-owner');
    session.selectNode('inner-placement');
    session.drillToMaster('inner-scope');
    session.selectNode('nested-placement');
    const view = render(<PropertiesPanel session={session} snap={session.getSnapshot()} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    view.rerender(<PropertiesPanel session={session} snap={session.getSnapshot()} />);
    const paths = within(screen.getByRole('combobox', { name: 'Field' }))
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value);
    expect(paths).toContain('parent.item.props.outerTitle');
    expect(paths).toContain('item.props.innerTitle');
    expect(paths).toContain('props.innerTitle');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Field' }),
      'parent.item.props.outerTitle',
    );
    expect(session.getSnapshot().document.nodes['nested-placement']?.displayOn).toEqual({
      path: 'parent.item.props.outerTitle',
      truthy: true,
    });
  });
});
