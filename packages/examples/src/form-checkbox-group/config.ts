import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      options: [
        {
          label: 'First option',
          value: 'first',
          disabled: false,
          checked: true,
        },
        {
          label: 'Second option',
          value: 'second',
          disabled: false,
          checked: false,
        },
      ],
      name: 'checkbox-choices',
    },
  },
};
