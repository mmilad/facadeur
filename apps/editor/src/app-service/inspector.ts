import { findNodeByUuid, type CoreController, type InspectorFormModel } from '@facadeur/core';

export interface InspectorViewModel extends InspectorFormModel {
  readonly selectionKind: 'root' | 'instance' | 'element';
  readonly previewDataVisible: boolean;
  readonly formValue: Omit<InspectorFormModel['formValue'], 'node'> & {
    node: InspectorFormModel['formValue']['node'] & { attributes: Record<string, string> };
  };
}

export interface InspectorFieldChangedEvent {
  readonly type: 'inspector-field-changed';
  readonly definitionUuid: string;
  readonly nodeUuid: string;
  readonly path: string;
  readonly previous: unknown;
  readonly value: unknown;
}

export class InspectorService {
  private readonly listeners = new Set<(event: InspectorFieldChangedEvent) => void>();

  constructor(private readonly core: CoreController) {}

  getModel(nodeUuid?: string): InspectorViewModel | null {
    const snapshot = this.core.getSnapshot();
    const definition = snapshot.openDefinition;
    if (!definition) return null;
    const model = this.core.node.preview.inspectorForm(nodeUuid);
    if (!model) return null;
    const node = findNodeByUuid(definition.root, model.nodeUuid);
    if (!node) return null;
    const hasSchema = model.fields.some(
      (field) => field.type === 'section' && field.title === 'Preview defaults',
    );
    const selectionKind =
      model.nodeUuid === definition.root.uuid
        ? 'root'
        : node.config?.definitionRef !== undefined
          ? 'instance'
          : 'element';
    const attributes = Object.fromEntries(
      Object.entries(node.dom.attributes ?? {}).filter(([key]) => key !== 'class'),
    );

    return {
      ...model,
      formValue: {
        ...model.formValue,
        node: { ...model.formValue.node, attributes },
      },
      selectionKind,
      previewDataVisible: hasSchema && selectionKind !== 'element',
    };
  }

  updateField(input: { nodeUuid: string; path: string; value: unknown }) {
    const model = this.getModel(input.nodeUuid);
    if (!model) return;
    const previous = valueAtPath(model.formValue, input.path);
    const definitionUuid = this.core.getSnapshot().openDefinition?.uuid;
    if (!definitionUuid) return;

    if (input.path === 'node.attributes') {
      this.core.patchNodeDomAttributeRecord(input.nodeUuid, stringRecord(input.value));
    } else {
      this.core.node.preview.applyFormChange(input.path, input.value, input.nodeUuid);
    }
    const event: InspectorFieldChangedEvent = {
      type: 'inspector-field-changed',
      definitionUuid,
      nodeUuid: input.nodeUuid,
      path: input.path,
      previous,
      value: input.value,
    };
    for (const listener of this.listeners) listener(event);
  }

  subscribe(listener: (event: InspectorFieldChangedEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

function stringRecord(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function valueAtPath(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}
