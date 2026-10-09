import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleProductCardIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleProductCardIds.nodes.img1]: {
    width: '100%',
    height: '240px',
    display: 'block',
    objectFit: 'cover',
  },
  [exampleProductCardIds.nodes.h21]: {
    color: tokenRef(exampleTokenIds.color.text.primary),
    font: tokenRef(exampleTokenIds.type.title),
    margin: tokenRef(exampleTokenIds.space.scale.step0),
    overflowWrap: 'anywhere',
  },
  [exampleProductCardIds.nodes.p1]: {
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.body),
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleProductCardIds.nodes.div2]: {
    width: '100%',
    height: 'auto',
  },
  [exampleProductCardIds.nodes.div1]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokenRef(exampleTokenIds.space.gap.md),
    padding: tokenRef(exampleTokenIds.space.inset.lg),
    height: 'auto',
  },
  [exampleProductCardIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    height: 'auto',
    maxWidth: '360px',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    border: '1px solid ' + tokenRef(exampleTokenIds.color.border.default),
    borderRadius: tokenRef(exampleTokenIds.radius.lg),
    boxShadow: tokenRef(exampleTokenIds.shadow.md),
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
