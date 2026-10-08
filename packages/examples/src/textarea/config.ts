import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      label: 'Message',
      value: '',
      placeholder: 'Tell us about your project',
      name: 'message',
      rows: 3,
      resize: 'vertical',
    },
  },
};
