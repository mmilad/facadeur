import type { DesignTokenRecord, DesignTokenUuid } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from './idList';

export const radius = {
  [exampleTokenIds.radius.full]: {
    uuid: exampleTokenIds.radius.full,
    label: 'Full',
    group: '',
    valueType: 'dimension',
    value: '999px',
  },
  [exampleTokenIds.radius.lg]: {
    uuid: exampleTokenIds.radius.lg,
    label: 'Lg',
    group: '',
    valueType: 'dimension',
    value: '12px',
  },
  [exampleTokenIds.radius.md]: {
    uuid: exampleTokenIds.radius.md,
    label: 'Md',
    group: '',
    valueType: 'dimension',
    value: '8px',
  },
  [exampleTokenIds.radius.none]: {
    uuid: exampleTokenIds.radius.none,
    label: 'None',
    group: '',
    valueType: 'dimension',
    value: '0',
  },
  [exampleTokenIds.radius.sm]: {
    uuid: exampleTokenIds.radius.sm,
    label: 'Sm',
    group: '',
    valueType: 'dimension',
    value: '4px',
  },
  [exampleTokenIds.radius.xl]: {
    uuid: exampleTokenIds.radius.xl,
    label: 'Xl',
    group: '',
    valueType: 'dimension',
    value: '16px',
  },
} as const satisfies Readonly<Record<DesignTokenUuid, DesignTokenRecord>>;
