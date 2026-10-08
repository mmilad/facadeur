import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';

export const config: NodeDefinitionModel['config'] = {
  previewData: {
    fields: {
      title: 'Build pages from clear contracts',
      body: 'Atoms and components with explicit fields agents can read and authors can preview.',
      imageSrc:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%231e3a8a'/%3E%3Cstop offset='1' stop-color='%233b82f6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1280' height='720' fill='url(%23g)'/%3E%3C/svg%3E",
      imageAlt: 'Blue gradient hero',
      ctaLabel: 'Read the docs',
      ctaHref: '#docs',
    },
  },
};
