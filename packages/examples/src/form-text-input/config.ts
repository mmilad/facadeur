import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      label: 'Work email',
      hint: 'Use your work email address.',
      hasIcon: false,
      state: 'default',
    },
  },
};
