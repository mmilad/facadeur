declare module '*jsonjoy-builder/dist/components/SchemaEditor/TypeEditor.js' {
  import type { ReactElement } from 'react';
  import type { JsonSchema } from 'jsonjoy-builder';

  const TypeEditor: (props: {
    schema: JsonSchema;
    onChange: (schema: JsonSchema) => void;
    readOnly?: boolean;
    depth?: number;
  }) => ReactElement;

  export default TypeEditor;
}
