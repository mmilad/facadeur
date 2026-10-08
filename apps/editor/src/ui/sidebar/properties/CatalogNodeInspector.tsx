'use client';

import type { AppService } from '../../../app-service';
import type { EditorSession } from '../../../domain/session';
import { Form } from '../../form/Form';
import { SchemaForm } from '../../form/schema/SchemaForm';
import { Stack } from '../../form/components/layout/Stack';
import { mapInspectorFormFields } from './map-inspector-form';

export function CatalogNodeInspector({
  app,
  session,
  nodeUuid,
  formKey,
}: {
  app: AppService;
  session: EditorSession;
  nodeUuid: string;
  formKey: string;
}) {
  const model = app.core.node.preview.inspectorForm(nodeUuid);
  if (!model) {
    return <p className="inspector-empty">Select a node in the layer tree.</p>;
  }

  return (
    <Stack gap={16} data-testid="catalog-node-inspector">
      <Form
        key={formKey}
        value={model.formValue}
        designPropOptions={model.propOptions}
        onChange={(_, meta) => {
          try {
            app.core.node.preview.applyFormChange(meta.path, meta.next, model.nodeUuid);
          } catch (failure) {
            session.setNotice(
              failure instanceof Error ? failure.message : 'Could not update inspector field',
              'error',
            );
          }
        }}
      >
        <SchemaForm fields={mapInspectorFormFields(model.fields)} />
      </Form>
    </Stack>
  );
}
