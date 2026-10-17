import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';
import { registerExampleStyles } from '../register-example-styles';
import { config } from './config';
import { root } from './dom';
import { ids as iconIds } from './idList';
import { schema } from './schema';
import { styles } from './style';

registerExampleStyles(root, styles);

export const definition = {
  uuid: iconIds.definition,
  name: 'Icon',
  kind: 'atom',
  schema: { kind: 'inline', schema },
  root,
  config,
} satisfies NodeDefinitionModel;
