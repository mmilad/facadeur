import type { ProjectCatalog } from '@facadeur/domain';
import { globalIds as exampleGlobalIds } from './idList';

export const globalStyles = {
  breakpoints: [
    {
      uuid: exampleGlobalIds.breakpoints.phone,
      label: 'Phone',
      minWidth: 375,
    },
    {
      uuid: exampleGlobalIds.breakpoints.tablet,
      label: 'Tablet',
      minWidth: 768,
    },
    {
      uuid: exampleGlobalIds.breakpoints.laptop,
      label: 'Laptop',
      minWidth: 1024,
    },
    {
      uuid: exampleGlobalIds.breakpoints.desktop,
      label: 'Desktop',
      minWidth: 1200,
    },
    {
      uuid: exampleGlobalIds.breakpoints.wide,
      label: 'Wide',
      minWidth: 1440,
    },
    {
      uuid: exampleGlobalIds.breakpoints.ultra,
      label: 'Ultra',
      minWidth: 1760,
    },
  ],
} satisfies NonNullable<ProjectCatalog['globalStyles']>;
