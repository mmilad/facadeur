import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      name: 'label',
      type: 'Text',
      value: 'Continue',
      state: 'default',
    },
  },
};
