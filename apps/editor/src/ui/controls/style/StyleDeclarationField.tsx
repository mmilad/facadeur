import type { ReactNode } from 'react';
import { Combobox, Field, Select } from '../../form/index.js';
import { ColorControl } from '../color/index.js';
import { ShadowControl } from '../shadow/index.js';
import { TextControl } from '../fields/index.js';
import { TypographyStyleControl, type TypographyCatalogs } from '../typography/index.js';
import { catalogTokenOptions, dimensionTokenOptions } from '../token-options.js';
import { enumOptionsForProperty, styleDeclarationKind } from './declaration-kind.js';

export function StyleDeclarationField({
  property,
  value,
  placeholder,
  name,
  colorTokens,
  shadowTokens,
  typographyTokens,
  dimensionTokens,
  typographyCatalogs,
  onCommit,
  after,
}: {
  property: string;
  value: string;
  placeholder?: string;
  name: string;
  colorTokens: readonly string[];
  shadowTokens: readonly string[];
  typographyTokens: readonly string[];
  dimensionTokens: readonly string[];
  typographyCatalogs: TypographyCatalogs;
  onCommit: (next: string) => void;
  after?: ReactNode;
}) {
  const kind = styleDeclarationKind(property);
  const enumOptions = enumOptionsForProperty(property);

  let control: ReactNode;
  switch (kind) {
    case 'color':
      control = (
        <ColorControl
          name={name}
          label={property}
          value={value}
          colorTokens={colorTokens}
          onCommit={(next) => onCommit(next ?? '')}
        />
      );
      break;
    case 'shadow':
      control = (
        <ShadowControl
          name={name}
          label={property}
          value={value}
          shadowTokens={shadowTokens}
          onCommit={(next) => onCommit(next ?? '')}
        />
      );
      break;
    case 'typography':
      control = (
        <TypographyStyleControl
          name={name}
          label={property}
          property={property}
          value={value}
          catalogs={typographyCatalogs}
          onCommit={(next) => onCommit(next ?? '')}
        />
      );
      break;
    case 'typography-token':
      control = (
        <Field label={property}>
          <Combobox
            name={name}
            value={value}
            options={catalogTokenOptions(typographyTokens, value, 'None')}
            onCommit={onCommit}
          />
        </Field>
      );
      break;
    case 'spacing':
      control = (
        <Field label={property}>
          <Combobox
            name={name}
            value={value}
            placeholder={placeholder}
            options={dimensionTokenOptions(dimensionTokens, value, 'None')}
            onCommit={onCommit}
          />
        </Field>
      );
      break;
    case 'enum':
      control = (
        <Field label={property}>
          <Select
            name={name}
            value={value || enumOptions![0]}
            options={enumOptions!.map((option) => ({ value: option, label: option }))}
            onCommit={onCommit}
          />
        </Field>
      );
      break;
    default:
      control = (
        <TextControl
          label={property}
          name={name}
          value={value}
          placeholder={placeholder}
          onCommit={onCommit}
        />
      );
  }

  return (
    <div className="declaration-row">
      {control}
      {after}
    </div>
  );
}
