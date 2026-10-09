import type { DesignTokenRecord, DesignTokenUuid } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from './idList';

export const shadows = {
  [exampleTokenIds.shadow.lg]: {
    uuid: exampleTokenIds.shadow.lg,
    label: 'Lg',
    group: '',
    valueType: 'shadow',
    value: {
      blur: '40px',
      color: '#0f172a29',
      offsetX: '0px',
      offsetY: '16px',
      spread: '0px',
    },
  },
  [exampleTokenIds.shadow.md]: {
    uuid: exampleTokenIds.shadow.md,
    label: 'Md',
    group: '',
    valueType: 'shadow',
    value: {
      blur: '24px',
      color: '#0f172a1f',
      offsetX: '0px',
      offsetY: '8px',
      spread: '0px',
    },
  },
  [exampleTokenIds.shadow.sm]: {
    uuid: exampleTokenIds.shadow.sm,
    label: 'Sm',
    group: '',
    valueType: 'shadow',
    value: {
      blur: '2px',
      color: '#0f172a14',
      offsetX: '0px',
      offsetY: '1px',
      spread: '0px',
    },
  },
} as const satisfies Readonly<Record<DesignTokenUuid, DesignTokenRecord>>;
