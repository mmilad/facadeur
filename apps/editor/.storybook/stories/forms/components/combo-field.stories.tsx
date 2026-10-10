import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { card, exampleCatalog, exampleIds, tokenRef } from '@facadeur/examples';
import { TransformableField, type TransformableFieldOption } from '@facadeur/form';
import { ComboField } from '../../../../src/ui/combofield/ComboField';
import {
  TokenPreviewProvider,
  useTokenLabel,
  useTokenResolver,
  useTokenSearchValue,
} from '../../../../src/ui/controls/fields/TokenPreviewContext';
import { createStorybookEditor } from '../../../fixtures/editor';

function ExampleTokenProvider({ children }: { children: ReactNode }) {
  const editor = useMemo(() => createStorybookEditor(card.uuid, card.root.uuid), []);
  useEffect(() => () => editor.session.destroy(), [editor.session]);
  const { design, document } = editor.session.getSnapshot();

  return (
    <TokenPreviewProvider design={design} document={document} breakpointId={null}>
      {children}
    </TokenPreviewProvider>
  );
}

function TokenFieldsExample() {
  const labelFor = useTokenLabel();
  const resolve = useTokenResolver();
  const searchValue = useTokenSearchValue();
  const dimensionOptions = exampleTokenOptions(
    Object.values(exampleCatalog.tokens?.space ?? {}),
    'Spacing',
    labelFor,
    resolve,
    searchValue,
  );
  const colorOptions = exampleTokenOptions(
    Object.values(exampleCatalog.tokens?.color ?? {}),
    'Colors',
    labelFor,
    resolve,
    searchValue,
    true,
  );
  const [values, setValues] = useState({
    x: tokenRef(exampleIds.tokens.space.scale.step0),
    y: tokenRef(exampleIds.tokens.space.scale.step4),
    blur: tokenRef(exampleIds.tokens.space.scale.step6),
    color: tokenRef(exampleIds.tokens.color.neutral._900),
  });
  const rows = [
    { key: 'x', label: 'X offset' },
    { key: 'y', label: 'Y offset' },
    { key: 'blur', label: 'Blur' },
    { key: 'color', label: 'Color' },
  ] as const;

  return (
    <ComboField
      legend="Shadow"
      fields={rows.map(({ key, label }) => {
        const name = `shadow-${key}`;
        const id = `combo-${name}`;
        const fieldOptions = key === 'color' ? colorOptions : dimensionOptions;
        return {
          key,
          label,
          htmlFor: id,
          control: (
            <TransformableField
              id={id}
              name={name}
              label={label}
              value={values[key]}
              fieldOptions={fieldOptions}
              placeholder={key === 'color' ? '#0f172a' : '0px'}
              onTransform={() => setValues((current) => ({ ...current, [key]: '' }))}
              onChange={(next) => setValues((current) => ({ ...current, [key]: next }))}
            />
          ),
        };
      })}
    >
      <div className="eu-field">
        <label>
          <input type="checkbox" /> Inset
        </label>
      </div>
    </ComboField>
  );
}

function MixedFieldsExample() {
  const labelFor = useTokenLabel();
  const resolve = useTokenResolver();
  const searchValue = useTokenSearchValue();
  const typographyOptions = exampleTokenOptions(
    Object.values(exampleCatalog.tokens?.type ?? {}),
    'Typography',
    labelFor,
    resolve,
    searchValue,
  );
  const [fontSize, setFontSize] = useState('16px');
  const [styleToken, setStyleToken] = useState(tokenRef(exampleIds.tokens.type.body));

  return (
    <ComboField
      legend="Typography"
      fields={[
        {
          key: 'font-size',
          label: 'Size',
          htmlFor: 'combo-font-size',
          control: (
            <TransformableField
              id="combo-font-size"
              name="font-size"
              label="Size"
              value={fontSize}
              fieldOptions={dimensionOptionsForExample(labelFor, resolve, searchValue)}
              placeholder="16px"
              onTransform={() => setFontSize('')}
              onChange={setFontSize}
            />
          ),
        },
        {
          key: 'type-style',
          label: 'Type style',
          name: 'type-style',
          htmlFor: 'combo-type-style',
          control: (
            <TransformableField
              id="combo-type-style"
              name="type-style"
              label="Type style"
              value={styleToken}
              fieldOptions={typographyOptions}
              onTransform={() => setStyleToken('')}
              onChange={setStyleToken}
            />
          ),
          hint: <span className="meta">Inherited</span>,
        },
      ]}
    >
      <div style={{ padding: '4px 0', textAlign: 'center' }}>Aa — The quick brown fox</div>
    </ComboField>
  );
}

function dimensionOptionsForExample(
  labelFor: (reference: string) => string,
  resolve: (reference: string) => string | undefined,
  searchValue: (reference: string) => string | undefined,
) {
  return exampleTokenOptions(
    Object.values(exampleCatalog.tokens?.space ?? {}),
    'Spacing',
    labelFor,
    resolve,
    searchValue,
  );
}

function exampleTokenOptions(
  records: readonly { uuid: string; group?: string; label?: string }[],
  label: string,
  labelFor: (reference: string) => string,
  resolve: (reference: string) => string | undefined,
  searchValue: (reference: string) => string | undefined,
  includeColor = false,
): TransformableFieldOption[] {
  const groups = new Map<string, { value: string; label: string; description?: string }[]>();
  for (const token of records) {
    const reference = tokenRef(token.uuid);
    const group = token.group || 'Scale';
    const items = groups.get(group) ?? [];
    items.push({
      value: reference,
      label: labelFor(reference),
      description: resolve(reference) ?? searchValue(reference) ?? token.label,
    });
    groups.set(group, items);
  }

  return [
    { type: 'text', label: includeColor ? 'Text' : 'Dimension' },
    ...(includeColor ? [{ type: 'color' as const, label: 'Color' }] : []),
    {
      type: 'set',
      label: `${label} tokens`,
      items: [...groups].map(([group, items]) => ({
        type: 'token' as const,
        label: `${group} tokens`,
        items,
      })),
    },
  ];
}

const meta = {
  title: 'Forms/Components/Combo Field',
  component: ComboField,
  parameters: { controls: { disable: true } },
  decorators: [
    (Story) => (
      <div className="eu-form" style={{ maxWidth: 720, padding: 20 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ComboField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TokenFields: Story = {
  render: () => (
    <ExampleTokenProvider>
      <TokenFieldsExample />
    </ExampleTokenProvider>
  ),
};

export const MixedTokenAndCustomControls: Story = {
  render: () => (
    <ExampleTokenProvider>
      <MixedFieldsExample />
    </ExampleTokenProvider>
  ),
};
