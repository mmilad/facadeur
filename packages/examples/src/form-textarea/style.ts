import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormTextareaIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormTextareaIds.nodes.root]: {
    width: '100%',
    height: 'auto',
    appearance: 'none',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    border: '1px solid ' + tokenRef(exampleTokenIds.color.border.default),
    borderRadius: '{shape.radius}',
    boxSizing: 'border-box',
    color: tokenRef(exampleTokenIds.color.text.primary),
    font: tokenRef(exampleTokenIds.type.body),
    paddingBlock: '{input.padding.y}',
    paddingInline: '{input.padding.x}',
    resize: 'vertical',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
