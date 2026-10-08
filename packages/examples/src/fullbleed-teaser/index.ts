import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';
import { applyStyles } from '../apply-styles';
import { root } from './dom';
import { config } from './config';
import { styles } from './style';
import { schema } from './schema';
const schemaSource = { kind: 'inline', schema } as const;

export const definition = {
  uuid: '550e8400-e29b-41d4-a716-0000000003eb',
  name: 'Full-bleed teaser',
  kind: 'component',
  schema: schemaSource,
  root: applyStyles(root, styles),
  ...(Object.keys(config ?? {}).length ? { config } : {}),
} satisfies NodeDefinitionModel;
