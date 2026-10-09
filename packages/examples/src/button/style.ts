import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleButtonIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleButtonIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '{layout.gap}',
    width: 'auto',
    height: 'auto',
    appearance: 'none',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    border: '1px solid transparent',
    borderRadius: tokenRef(exampleTokenIds.radius.full),
    color: tokenRef(exampleTokenIds.color.text.primary),
    cursor: 'pointer',
    font: tokenRef(exampleTokenIds.type.label),
    letterSpacing: '0.01em',
    lineHeight: '1',
    paddingBlock: '{padding.y}',
    paddingInline: '{padding.x}',
    whiteSpace: 'nowrap',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
