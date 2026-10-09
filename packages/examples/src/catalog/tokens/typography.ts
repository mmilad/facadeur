import type { DesignTokenRecord, DesignTokenUuid } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from './idList';
import { globalIds as exampleGlobalIds } from '../idList';
import { tokenRef } from '../../references';

export const typography = {
  [exampleTokenIds.type.body]: {
    uuid: exampleTokenIds.type.body,
    label: 'Body',
    group: '',
    valueType: 'typography',
    value: {
      fontFamily: tokenRef(exampleTokenIds.font.inter),
      fontSize: '16px',
      fontWeight: 400,
      letterSpacing: '0',
      lineHeight: 1.5,
    },
    breakpoints: {
      [exampleGlobalIds.breakpoints.wide]: {
        fontSize: '18px',
      },
      [exampleGlobalIds.breakpoints.tablet]: {
        fontSize: '17px',
      },
    },
  },
  [exampleTokenIds.type.caption]: {
    uuid: exampleTokenIds.type.caption,
    label: 'Caption',
    group: '',
    valueType: 'typography',
    value: {
      fontFamily: tokenRef(exampleTokenIds.font.inter),
      fontSize: '12px',
      fontWeight: 400,
      letterSpacing: '0',
      lineHeight: 1.4,
    },
    breakpoints: {
      [exampleGlobalIds.breakpoints.wide]: {
        fontSize: '13px',
      },
    },
  },
  [exampleTokenIds.type.display]: {
    uuid: exampleTokenIds.type.display,
    label: 'Display',
    group: '',
    valueType: 'typography',
    value: {
      fontFamily: tokenRef(exampleTokenIds.font.inter),
      fontSize: '40px',
      fontWeight: 600,
      letterSpacing: '0',
      lineHeight: 1.1,
    },
    breakpoints: {
      [exampleGlobalIds.breakpoints.wide]: {
        fontSize: '56px',
      },
      [exampleGlobalIds.breakpoints.tablet]: {
        fontSize: '48px',
      },
    },
  },
  [exampleTokenIds.type.heading]: {
    uuid: exampleTokenIds.type.heading,
    label: 'Heading',
    group: '',
    valueType: 'typography',
    value: {
      fontFamily: tokenRef(exampleTokenIds.font.inter),
      fontSize: '32px',
      fontWeight: 600,
      letterSpacing: '0',
      lineHeight: 1.2,
    },
    breakpoints: {
      [exampleGlobalIds.breakpoints.wide]: {
        fontSize: '40px',
      },
      [exampleGlobalIds.breakpoints.tablet]: {
        fontSize: '36px',
      },
    },
  },
  [exampleTokenIds.type.label]: {
    uuid: exampleTokenIds.type.label,
    label: 'Label',
    group: '',
    valueType: 'typography',
    value: {
      fontFamily: tokenRef(exampleTokenIds.font.inter),
      fontSize: '14px',
      fontWeight: 500,
      letterSpacing: '0',
      lineHeight: 1.4,
    },
    breakpoints: {
      [exampleGlobalIds.breakpoints.wide]: {
        fontSize: '15px',
      },
    },
  },
  [exampleTokenIds.type.title]: {
    uuid: exampleTokenIds.type.title,
    label: 'Title',
    group: '',
    valueType: 'typography',
    value: {
      fontFamily: tokenRef(exampleTokenIds.font.inter),
      fontSize: '24px',
      fontWeight: 600,
      letterSpacing: '0',
      lineHeight: 1.25,
    },
    breakpoints: {
      [exampleGlobalIds.breakpoints.wide]: {
        fontSize: '28px',
      },
      [exampleGlobalIds.breakpoints.tablet]: {
        fontSize: '26px',
      },
    },
  },
} as const satisfies Readonly<Record<DesignTokenUuid, DesignTokenRecord>>;
