import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      value: '',
      placeholder: 'Enter a value',
      name: 'example-input',
      disabled: false,
    },
  },
};
