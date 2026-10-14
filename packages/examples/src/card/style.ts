import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleCardIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleCardIds.nodes.eyebrow]: {
    color: tokenRef(exampleTokenIds.color.accent.default),
    font: tokenRef(exampleTokenIds.type.caption),
    letterSpacing: '0.16em',
    margin: tokenRef(exampleTokenIds.space.scale.step0),
    textTransform: 'uppercase',
  },
  [exampleCardIds.nodes.title]: {
    color: tokenRef(exampleTokenIds.color.text.primary),
    font: tokenRef(exampleTokenIds.type.title),
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleCardIds.nodes.body]: {
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.body),
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleCardIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokenRef(exampleTokenIds.space.gap.md),
    padding: tokenRef(exampleTokenIds.space.inset.lg),
    width: '100%',
    height: 'auto',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    border: '1px solid ' + tokenRef(exampleTokenIds.color.border.default),
    borderRadius: tokenRef(exampleTokenIds.radius.md),
    boxShadow: tokenRef(exampleTokenIds.shadow.md),
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
