import type { ProjectCatalog } from "@facadeur/domain";

export const fonts = [
  {
    id: 'sans',
    family: 'Inter',
    weights: [400, 500, 600, 700],
    source: {
      type: 'google',
      family: 'Inter',
    },
    fallbacks: ['system-ui', 'sans-serif'],
  },
] satisfies NonNullable<ProjectCatalog['fonts']>;
