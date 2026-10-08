import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      label: 'Option',
      value: 'option',
      disabled: false,
      checked: false,
      name: 'choice',
    },
  },
};
