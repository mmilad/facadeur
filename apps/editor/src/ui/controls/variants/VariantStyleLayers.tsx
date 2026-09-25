import type { ReactNode } from 'react';
import type { VariantAxis } from '@facadeur/core';
import { Stack } from '../../form/index.js';
import '../../form/form.css';

export function VariantStyleLayers({
  axis,
  stateNames,
  renderDeclarations,
  renderStateDeclarations,
}: {
  axis: VariantAxis;
  stateNames: readonly string[];
  renderDeclarations: (value: string) => ReactNode;
  renderStateDeclarations: (value: string, state: string) => ReactNode;
}) {
  return (
    <Stack gap={8}>
      {axis.values.map((value) => (
        <details key={value} className="fold" open>
          <summary>
            {axis.name} = {value}
          </summary>
          {renderDeclarations(value)}
          {stateNames.map((state) => (
            <details key={state} className="fold">
              <summary>{state}</summary>
              {renderStateDeclarations(value, state)}
            </details>
          ))}
        </details>
      ))}
    </Stack>
  );
}
