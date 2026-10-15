import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';
import { registerExampleStyles } from '../register-example-styles';
import { root } from './dom';
import { config } from './config';
import { styles } from './style';
import { schemaUuid } from './schema';
import { ids as exampleImageIds } from './idList';
const schemaSource = { kind: 'ref', uuid: schemaUuid } as const;

registerExampleStyles(root, styles);

export const definition = {
  uuid: exampleImageIds.definition,
  name: 'Image',
  kind: 'atom',
  schema: schemaSource,
  root,
  ...(Object.keys(config ?? {}).length ? { config } : {}),
} satisfies NodeDefinitionModel;
