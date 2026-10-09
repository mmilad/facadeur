import type { DesignTokenRecord, DesignTokenUuid } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from './idList';

export const fonts = {
  [exampleTokenIds.font.inter]: {
    uuid: exampleTokenIds.font.inter,
    label: 'Inter',
    group: '',
    valueType: 'fontFamily',
    value: {
      fallbacks: ['system-ui', 'sans-serif'],
      family: 'Inter',
      source: {
        family: 'Inter',
        type: 'google',
      },
      weights: [400, 500, 600, 700],
    },
  },
} as const satisfies Readonly<Record<DesignTokenUuid, DesignTokenRecord>>;
