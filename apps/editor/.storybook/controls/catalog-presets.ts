import type { NodeDefinition } from '@facadeur/domain';
import { exampleCatalogDefinitions, exampleCatalogLayers } from '@facadeur/examples';

export interface CatalogPreset {
  readonly id: string;
  readonly label: string;
  readonly assetId: string;
  readonly layerUuid: string;
}

const definitions = exampleCatalogDefinitions();
const nameCounts = new Map<string, number>();
for (const definition of definitions) {
  nameCounts.set(definition.name, (nameCounts.get(definition.name) ?? 0) + 1);
}

function definitionLabel(definition: NodeDefinition) {
  return nameCounts.get(definition.name)! > 1
    ? `${definition.name} · ${definition.uuid.slice(-4)}`
    : definition.name;
}

export const catalogPresets: readonly CatalogPreset[] = definitions.flatMap((definition) =>
  exampleCatalogLayers(definition).map((layer) => ({
    id: `${definition.uuid}:${layer.uuid}`,
    label: `${definitionLabel(definition)} · ${layer.label}`,
    assetId: definition.uuid,
    layerUuid: layer.uuid,
  })),
);

export const catalogPresetOptions = catalogPresets.map(({ id }) => id);
export const catalogPresetLabels = Object.fromEntries(
  catalogPresets.map(({ id, label }) => [id, label]),
);

const defaultCard = definitions.find(({ name }) => name === 'Card');
export const defaultCatalogPreset =
  catalogPresets.find(
    ({ assetId, layerUuid }) =>
      assetId === defaultCard?.uuid && layerUuid === defaultCard.root.uuid,
  ) ?? catalogPresets[0]!;

export function resolveCatalogPreset(presetId: string) {
  const preset = catalogPresets.find(({ id }) => id === presetId) ?? defaultCatalogPreset;
  const definition = definitions.find(({ uuid }) => uuid === preset.assetId) ?? definitions[0]!;
  const layerUuid = exampleCatalogLayers(definition).some(({ uuid }) => uuid === preset.layerUuid)
    ? preset.layerUuid
    : definition.root.uuid;

  return { definition, layerUuid };
}
