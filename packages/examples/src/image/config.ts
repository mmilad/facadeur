import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect fill='%23dbeafe' width='800' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%232563eb' font-family='system-ui' font-size='28'%3EImage%3C/text%3E%3C/svg%3E",
      alt: 'Placeholder illustration',
      ratio: '16 / 9',
    },
  },
};
