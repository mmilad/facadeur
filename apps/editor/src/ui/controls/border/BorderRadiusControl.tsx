import { useEffect, useState } from 'react';
import { Grid, Stack } from '../../form/index.js';
import '../../form/form.css';
import { TokenValueControl } from '../fields/TokenValueControl.js';
import type { BorderRadiusValue } from './value.js';
import { expandRadiusValue, uniformRadiusValue } from './value.js';

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
  const [showCorners, setShowCorners] = useState(() => value.mode === 'corners');
  useEffect(() => {
    setShowCorners(value.mode === 'corners');
  }, [value.mode]);

  if (!showCorners && value.mode === 'uniform') {
    return (
      <Stack gap={8}>
        <TokenValueControl
          name={`${namePrefix}-border-radius`}
          label="Border radius"
          value={value.value}
          tokens={radiusTokens}
          placeholder="None"
          onCommit={(next) => onCommit({ mode: 'uniform', value: next ?? '' })}
        />
        <button
          type="button"
          className="text-button eu-mode-action"
          onClick={() => setShowCorners(true)}
        >
          Per corner
        </button>
      </Stack>
    );
  }

  const corners = value.mode === 'corners' ? value : expandRadiusValue(value.value);
  const corner = (side: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft', label: string) => (
    <TokenValueControl
      key={side}
      name={`${namePrefix}-radius-${side}`}
      label={label}
      value={corners[side]}
      tokens={radiusTokens}
      placeholder="None"
      onCommit={(next) => onCommit({ ...corners, [side]: next ?? '' })}
    />
  );

  const uniform = uniformRadiusValue(corners);

  return (
    <Stack gap={8}>
      <span className="eu-field__hint">Border radius per corner</span>
      <Grid columns={2}>
        {corner('topLeft', 'Top left')}
        {corner('topRight', 'Top right')}
        {corner('bottomRight', 'Bottom right')}
        {corner('bottomLeft', 'Bottom left')}
      </Grid>
      {uniform !== null ? (
        <button
          type="button"
          className="text-button eu-mode-action"
          onClick={() => {
            setShowCorners(false);
            if (value.mode === 'corners') onCommit({ mode: 'uniform', value: uniform });
          }}
        >
          One value
        </button>
      ) : (
        <span className="eu-field__hint">Corners differ; keep them separate.</span>
      )}
    </Stack>
  );
}
