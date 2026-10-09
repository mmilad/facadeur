import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';
import { applyStyles } from '../apply-styles';
import { root } from './dom';
import { config } from './config';
import { styles } from './style';
import { schema } from './schema';
import { ids as exampleFormCheckboxIds } from './idList';
const schemaSource = { kind: 'inline', schema } as const;

export const definition = {
  uuid: exampleFormCheckboxIds.definition,
  name: 'Checkbox',
  kind: 'atom',
  schema: schemaSource,
  root: applyStyles(root, styles),
  ...(Object.keys(config ?? {}).length ? { config } : {}),
} satisfies NodeDefinitionModel;
