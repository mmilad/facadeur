import type { FieldValue } from '@facadeur/domain';

export type InspectorFormChangeTarget =
  | { kind: 'definitionName'; value: string }
  | { kind: 'definitionFieldExposureMode'; mode: 'flat' | 'grouped' | 'manual' }
  | { kind: 'definitionFieldExposureFields'; value: Readonly<Record<string, string>> }
  | { kind: 'nodeTagName'; nodeUuid: string; value: string }
  | { kind: 'nodeText'; nodeUuid: string; value: string }
  | { kind: 'nodeClassList'; nodeUuid: string; value: readonly string[] }
  | { kind: 'nodeStyle'; nodeUuid: string; value: Readonly<Record<string, string>> }
  | { kind: 'nodeDataRecord'; nodeUuid: string; value: Readonly<Record<string, string>> }
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
