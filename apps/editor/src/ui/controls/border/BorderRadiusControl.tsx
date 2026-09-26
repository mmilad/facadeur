import { Combobox, Field, Stack } from '../../form/index.js';
import '../../form/form.css';
import { catalogTokenOptions } from '../token-options.js';
import type { BorderRadiusValue } from './value.js';

export function BorderRadiusControl({
  namePrefix,
  value,
  radiusTokens,
  onCommit,
}: {
  namePrefix: string;
  value: BorderRadiusValue;
  radiusTokens: readonly string[];
  onCommit: (next: BorderRadiusValue) => void;
}) {
  if (value.mode === 'uniform') {
    return (
      <Stack gap={8}>
        <Field label="Border radius">
          <Combobox
            name={`${namePrefix}-border-radius`}
            value={value.value}
            options={catalogTokenOptions(radiusTokens, value.value, 'None')}
            onCommit={(next) => onCommit({ mode: 'uniform', value: next })}
          />
        </Field>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            onCommit({
              mode: 'corners',
              topLeft: value.value,
              topRight: value.value,
              bottomRight: value.value,
              bottomLeft: value.value,
            })
          }
        >
          Per corner
        </button>
      </Stack>
    );
  }

  const corners = value;
  const corner = (side: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft', label: string) => (
    <Field key={side} label={label}>
      <Combobox
        name={`${namePrefix}-radius-${side}`}
        value={corners[side]}
        options={catalogTokenOptions(radiusTokens, corners[side], 'None')}
        onCommit={(next) => onCommit({ ...corners, [side]: next })}
      />
    </Field>
  );

  return (
    <Stack gap={8}>
      <span className="eu-field__hint">Border radius per corner</span>
      {corner('topLeft', 'Top left')}
      {corner('topRight', 'Top right')}
      {corner('bottomRight', 'Bottom right')}
      {corner('bottomLeft', 'Bottom left')}
      <button
        type="button"
        className="text-button"
        onClick={() => {
          const token =
            corners.topLeft || corners.topRight || corners.bottomRight || corners.bottomLeft || '';
          onCommit({ mode: 'uniform', value: token });
        }}
      >
        One token
      </button>
    </Stack>
  );
}
