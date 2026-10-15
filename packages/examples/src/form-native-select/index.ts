import type { NodeDefinition as NodeDefinitionModel } from '@facadeur/domain';
import { registerExampleStyles } from '../register-example-styles';
import { root } from './dom';
import { config } from './config';
import { styles } from './style';
import { schema } from './schema';
import { ids as exampleFormNativeSelectIds } from './idList';
const schemaSource = { kind: 'inline', schema } as const;

registerExampleStyles(root, styles);

export const definition = {
  uuid: exampleFormNativeSelectIds.definition,
  name: 'Select',
  kind: 'atom',
  schema: schemaSource,
  root,
  ...(Object.keys(config ?? {}).length ? { config } : {}),
} satisfies NodeDefinitionModel;
