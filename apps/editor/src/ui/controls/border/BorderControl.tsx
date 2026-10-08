import { Field, Grid, Select, Stack } from '../../form/index';
import '../../form/form.css';
import { ColorControl } from '../color/index';
import { TokenValueControl } from '../fields/TokenValueControl';
import { BORDER_STYLE_OPTIONS, type BorderValue } from './value';

export function BorderControl({
  namePrefix,
  value,
  colorTokens,
  dimensionTokens = [],
  onCommit,
}: {
  namePrefix: string;
  value: BorderValue;
  colorTokens: readonly string[];
  dimensionTokens?: readonly string[];
  onCommit: (next: BorderValue) => void;
}) {
  return (
    <Stack gap={8}>
      <Grid columns={2}>
        <TokenValueControl
          name={`${namePrefix}-border-width`}
          label="Width"
          value={value.width}
          tokens={dimensionTokens}
          placeholder="1px"
          onCommit={(next) => onCommit({ ...value, width: next ?? '' })}
        />
        <Field label="Style">
          <Select
            name={`${namePrefix}-border-style`}
            value={value.style || 'solid'}
            options={[
              ...BORDER_STYLE_OPTIONS.map((style) => ({ value: style, label: style })),
              ...(value.style &&
              !BORDER_STYLE_OPTIONS.includes(value.style as (typeof BORDER_STYLE_OPTIONS)[number])
                ? [{ value: value.style, label: value.style }]
                : []),
            ]}
            onCommit={(next) => onCommit({ ...value, style: next })}
          />
        </Field>
      </Grid>
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
