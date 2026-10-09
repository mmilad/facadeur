import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';
import { applyStyles } from '../apply-styles';
import { root } from './dom';
import { config } from './config';
import { styles } from './style';
import { schemaUuid } from './schema';
import { ids as exampleImageIds } from './idList';
const schemaSource = { kind: 'ref', uuid: schemaUuid } as const;

export const definition = {
  uuid: exampleImageIds.definition,
  name: 'Image',
  kind: 'atom',
  schema: schemaSource,
  root: applyStyles(root, styles),
  ...(Object.keys(config ?? {}).length ? { config } : {}),
} satisfies NodeDefinitionModel;
