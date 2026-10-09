import React from 'react';
import { Form } from '@facadeur/form';
import { AddonPanel } from 'storybook/internal/components';
import { useArgs, useParameter } from 'storybook/manager-api';
import type { StorybookSchemaFormConfig } from './types';

interface SchemaFormPanelProps {
  readonly active: boolean;
  readonly parameterKey: string;
}

type Args = Record<string, unknown>;

export function SchemaFormPanel({ active, parameterKey }: SchemaFormPanelProps) {
  const [args, updateArgs] = useArgs();
  const config = useParameter<StorybookSchemaFormConfig | undefined>(parameterKey, undefined);

  return (
    <AddonPanel active={active}>
      {config?.fields.length ? (
        <div style={{ padding: 16 }}>
          <Form<Args> value={args} fields={config.fields} onChange={updateArgs} />
        </div>
      ) : (
        <p style={{ padding: 16 }}>This story has no schema form configured.</p>
      )}
    </AddonPanel>
  );
}
