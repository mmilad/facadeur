import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      options: [
        {
          value: '',
          label: 'Choose an option',
        },
        {
          value: 'first',
          label: 'First option',
        },
        {
          value: 'second',
          label: 'Second option',
        },
      ],
      value: '',
      name: 'selection',
      disabled: false,
    },
  },
};
