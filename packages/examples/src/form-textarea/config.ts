import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      value: '',
      placeholder: 'Enter a message',
      name: 'message',
      disabled: false,
      rows: 3,
    },
  },
};
