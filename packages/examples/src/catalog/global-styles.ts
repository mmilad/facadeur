import type { ProjectCatalog } from "@facadeur/domain";

export const globalStyles = {
  breakpoints: [
    {
      id: 'xs',
      label: 'Phone',
      minWidth: 375,
    },
    {
      id: 'sm',
      label: 'Tablet',
      minWidth: 768,
    },
    {
      id: 'md',
      label: 'Laptop',
      minWidth: 1024,
    },
    {
      id: 'lg',
      label: 'Desktop',
      minWidth: 1200,
    },
    {
      id: 'xl',
      label: 'Wide',
      minWidth: 1440,
    },
    {
      id: 'xxl',
      label: 'Ultra',
      minWidth: 1760,
    },
  ],
} satisfies NonNullable<ProjectCatalog['globalStyles']>;

