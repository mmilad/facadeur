'use client';

import { SchemaBuilderProvider, type JsonSchema as JoySchema } from 'jsonjoy-builder';
import 'jsonjoy-builder/styles.css';
import TypeEditor from '../stage/jsonjoy-type-editor';
import styles from '../stage/SchemaLibraryStage.module.css';

const EDITOR_LABELS = {
  schemaTypeString: 'String',
  schemaTypeNumber: 'Number',
  schemaTypeBoolean: 'Boolean',
  schemaTypeObject: 'Object',
  schemaTypeArray: 'Array',
  schemaTypeAnyOf: 'Any of',
  schemaTypeOneOf: 'One of',
  schemaTypeAllOf: 'All of',
  anyOfAddOption: 'Add option',
  oneOfAddOption: 'Add option',
  allOfAddSchema: 'Add schema',
  stringAllowedValuesEnumLabel: 'Allowed values (enum)',
};

/** Visual JSON Schema editor (jsonjoy TypeEditor) for catalog and contract surfaces. */
export function JsonSchemaTypeEditor({
  schema,
  onChange,
}: {
  schema: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <SchemaBuilderProvider messages={EDITOR_LABELS}>
      <div className={`jsonjoy ${styles.joy}`} data-testid="json-schema-type-editor">
        <TypeEditor
          schema={schema as JoySchema}
          onChange={(next: JoySchema) => {
            if (!next || typeof next !== 'object') return;
            onChange({ ...next } as Record<string, unknown>);
          }}
        />
      </div>
    </SchemaBuilderProvider>
  );
}
