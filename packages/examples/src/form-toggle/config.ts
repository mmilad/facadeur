import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      label: 'Use token',
      value: 'Enabled',
      state: 'on',
    },
  },
};
