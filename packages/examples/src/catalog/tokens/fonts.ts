import type { DesignTokenRecord, DesignTokenUuid } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from './idList';

export const fonts = {
  [exampleTokenIds.font.systemUi]: {
    uuid: exampleTokenIds.font.systemUi,
    label: 'System UI',
    group: '',
    valueType: 'fontFamily',
    value: {
      fallbacks: ['sans-serif'],
      family: 'system-ui',
      source: { type: 'system' },
      weights: [400, 500, 600, 700],
    },
  },
  [exampleTokenIds.font.georgia]: {
    uuid: exampleTokenIds.font.georgia,
    label: 'Georgia',
    group: '',
    valueType: 'fontFamily',
    value: {
      fallbacks: ['serif'],
      family: 'Georgia',
      source: { type: 'system' },
      weights: [400, 700],
    },
  },
} as const satisfies Readonly<Record<DesignTokenUuid, DesignTokenRecord>>;
