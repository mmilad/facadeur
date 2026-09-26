import type { FlatNode } from '@facadeur/core';
import type { EditorSession } from '../../../../domain/session.js';
import { attributeEnumOptions } from '../../../controls/html/index.js';
import { TextControl } from '../../../controls/fields/index.js';
import { Field, Select } from '../../../form/index.js';

export function NodeAttributeFields({
  session,
  node,
  entries,
}: {
  session: EditorSession;
  node: Exclude<FlatNode, { type: 'instance' }>;
  entries: [string, string][];
}) {
  return entries.map(([key, value]) => {
    const enumOptions = attributeEnumOptions(key);
    if (enumOptions) {
      return (
        <Field key={key} label={key}>
          <Select
            name={`attr-${key}`}
            value={value}
            options={enumOptions.map((option) => ({ value: option, label: option }))}
            onCommit={(next) => commitAttribute(session, node, key, next)}
          />
        </Field>
      );
    }
    return (
      <TextControl
        key={key}
        label={key}
        name={`attr-${key}`}
        value={value}
        onCommit={(next) => commitAttribute(session, node, key, next)}
      />
    );
  });
}

function commitAttribute(
  session: EditorSession,
  node: Exclude<FlatNode, { type: 'instance' }>,
  key: string,
  value: string,
) {
  const attributes = { ...(node.attributes ?? {}) };
  if (value === '') delete attributes[key];
  else attributes[key] = value;
  session.execute({
    type: 'setProp',
    nodeId: node.id,
    prop: 'attributes',
    value: Object.keys(attributes).length ? attributes : null,
  });
}
