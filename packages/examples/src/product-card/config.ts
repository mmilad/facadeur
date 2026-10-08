import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      title: 'Everyday ceramic mug',
      price: '€24.00',
      imageSrc:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 720 540'%3E%3Crect width='720' height='540' fill='%23eee8df'/%3E%3Cellipse cx='360' cy='430' rx='170' ry='24' fill='%23d7cec0'/%3E%3Cpath d='M450 210h42a60 60 0 0 1 0 120h-42' fill='none' stroke='%23758674' stroke-width='28'/%3E%3Cpath d='M245 185h220v170a65 65 0 0 1-65 65h-90a65 65 0 0 1-65-65z' fill='%238b9d88'/%3E%3Cellipse cx='355' cy='185' rx='110' ry='24' fill='%23687965'/%3E%3Cellipse cx='355' cy='185' rx='90' ry='14' fill='%233f4c3e'/%3E%3C/svg%3E",
      imageAlt: 'Sage green ceramic mug on a warm neutral background',
      buttonLabel: 'Add to bag',
    },
  },
};
