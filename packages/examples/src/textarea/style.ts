import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleTextareaIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleTextareaIds.nodes.span1]: {
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleTextareaIds.nodes.textarea1]: {
    width: '100%',
    height: 'auto',
    appearance: 'none',
    background: tokenRef(exampleTokenIds.color.bg.muted),
    border: '1px solid ' + tokenRef(exampleTokenIds.color.neutral._400),
    borderRadius: '{input.radius}',
    boxSizing: 'border-box',
    color: tokenRef(exampleTokenIds.color.text.primary),
    display: 'block',
    font: tokenRef(exampleTokenIds.type.body),
    letterSpacing: '0',
    paddingBlock: '{input.padding.y}',
    paddingInline: '{input.padding.x}',
    resize: 'vertical',
    textTransform: 'none',
  },
  [exampleTextareaIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokenRef(exampleTokenIds.space.gap.xs),
    width: '100%',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.label),
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
