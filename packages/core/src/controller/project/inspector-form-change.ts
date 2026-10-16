import type { CompositionSource, FieldValue } from '@facadeur/domain';

export type InspectorFormChangeTarget =
  | { kind: 'definitionName'; value: string }
  | {
      kind: 'definitionStaticField';
      field: string;
      setting: 'isStatic' | 'value' | 'expose';
      value: boolean | FieldValue;
    }
  | {
      kind: 'definitionInstanceField';
      instanceUuid: string;
      field: string;
      setting: 'isStatic' | 'value' | 'expose';
      value: boolean | FieldValue;
    }
  | { kind: 'nodeTagName'; nodeUuid: string; value: string }
  | { kind: 'nodeText'; nodeUuid: string; value: string }
  | { kind: 'nodeClassList'; nodeUuid: string; value: readonly string[] }
  | { kind: 'nodeDataRecord'; nodeUuid: string; value: Readonly<Record<string, string>> }
  | {
      kind: 'nodeComposition';
      nodeUuid: string;
      patch: {
        readonly source?: CompositionSource | null;
        readonly indexName?: string | null;
        readonly compositionCase?: string | null;
        readonly definitionRefBinding?:
          import('@facadeur/domain').NodeConfig['definitionRefBinding'] | null;
      };
    }
  | { kind: 'nodeFieldExposureMode'; nodeUuid: string; mode: 'flat' | 'grouped' | 'manual' }
  | { kind: 'nodeFieldExposureGroupName'; nodeUuid: string; value: string }
  | { kind: 'nodeFieldExposureFields'; nodeUuid: string; value: Readonly<Record<string, string>> }
  | {
      kind: 'previewField';
      definitionUuid: string;
      field: string;
      value: FieldValue | undefined;
    }
  | { kind: 'nodeSchemaField'; nodeUuid: string; field: string; value: FieldValue | undefined };
