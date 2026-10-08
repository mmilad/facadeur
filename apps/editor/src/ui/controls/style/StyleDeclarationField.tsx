import type { ReactNode } from 'react';
import { Combobox, Field, Select } from '../../form/index';
import { ColorControl } from '../color/index';
import { ShadowControl } from '../shadow/index';
import { TextControl } from '../fields/index';
import { TypographyStyleControl, type TypographyCatalogs } from '../typography/index';
import { useTokenOptions } from '../token-options';
import { useTokenValueLabel } from '../fields/TokenPreviewContext';
import { isTokenReference } from '../fields/TokenValueControl';
import {
  enumOptionLabel,
  enumOptionsForProperty,
  styleDeclarationKind,
  stylePropertyLabel,
} from './declaration-kind';

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
  const tokenOptions = useTokenOptions();
  const tokenValueLabel = useTokenValueLabel();
  const currentLabel = isTokenReference(value) ? tokenValueLabel(value) : undefined;
  const label = stylePropertyLabel(property);
  const enumOptions = enumOptionsForProperty(property);

  let control: ReactNode;
  switch (kind) {
    case 'color':
      control = (
        <ColorControl
          name={name}
          label={label}
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
          label={label}
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
          label={label}
          property={property}
          value={value}
          catalogs={typographyCatalogs}
          onCommit={(next) => onCommit(next ?? '')}
        />
      );
      break;
    case 'typography-token':
      control = (
        <Field label={label}>
          <Combobox
            name={name}
            value={value}
            currentLabel={currentLabel}
            options={tokenOptions(typographyTokens, value)}
            onCommit={onCommit}
          />
        </Field>
      );
      break;
    case 'spacing':
      control = (
        <Field label={label}>
          <Combobox
            name={name}
            value={value}
            currentLabel={currentLabel}
            placeholder={placeholder}
            options={tokenOptions(dimensionTokens, value)}
            onCommit={onCommit}
          />
        </Field>
      );
      break;
    case 'enum':
      // Keep an existing value that is newer than our option catalog editable.
      // A select would silently display its first option and lose that value.
      control =
        enumOptions && value && !enumOptions.includes(value) ? (
          <TextControl label={label} name={name} value={value} onCommit={onCommit} />
        ) : (
          <Field label={label}>
            <Select
              name={name}
              value={value}
              options={[
                { value: '', label: 'Unset' },
                ...enumOptions!.map((option) => ({
                  value: option,
                  label: enumOptionLabel(property, option),
                })),
              ]}
              onCommit={onCommit}
            />
          </Field>
        );
      break;
    default:
      control = (
        <TextControl
          label={label}
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
