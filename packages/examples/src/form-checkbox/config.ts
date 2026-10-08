import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      checked: false,
      value: 'yes',
      name: 'accepted',
      disabled: false,
    },
  },
};
