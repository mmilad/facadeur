import { Field, Select, Stack, TextInput } from '../../form/index.js';
import '../../form/form.css';
import { ColorControl } from '../color/index.js';
import { BORDER_STYLE_OPTIONS, type BorderValue } from './value.js';

export function BorderControl({
  namePrefix,
  value,
  colorTokens,
  onCommit,
}: {
  namePrefix: string;
  value: BorderValue;
  colorTokens: readonly string[];
  onCommit: (next: BorderValue) => void;
}) {
  return (
    <Stack gap={8}>
      <Field label="Border width">
        <TextInput
          name={`${namePrefix}-border-width`}
          value={value.width}
          placeholder="1px"
          onCommit={(next) => onCommit({ ...value, width: next })}
        />
      </Field>
      <Field label="Border style">
        <Select
          name={`${namePrefix}-border-style`}
          value={value.style || 'solid'}
          options={BORDER_STYLE_OPTIONS.map((style) => ({ value: style, label: style }))}
          onCommit={(next) => onCommit({ ...value, style: next })}
        />
      </Field>
      <ColorControl
        name={`${namePrefix}-border-color`}
        label="Border color"
        value={value.color}
        colorTokens={colorTokens}
        onCommit={(next) => onCommit({ ...value, color: next ?? '' })}
      />
    </Stack>
  );
}
