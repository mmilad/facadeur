import type { Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { definitions as atoms } from './catalog/atoms';
import { definitions as components } from './catalog/components';
import { definitions as pages } from './catalog/pages';
import { fonts, globalStyles, schemas, tokens } from './catalog/design-system';

export const EXAMPLE_CATALOG_IDS = {
  imageSchema: '550e8400-e29b-41d4-a716-000000000001',
  'form-checkbox': '550e8400-e29b-41d4-a716-420b18ee8a9d',
  'form-native-select': '550e8400-e29b-41d4-a716-b5093c94a3b0',
  'form-radio': '550e8400-e29b-41d4-a716-f031a6662752',
  'form-textarea': '550e8400-e29b-41d4-a716-cf428f1222a4',
  image: '550e8400-e29b-41d4-a716-000000000002',
  'text-body': '550e8400-e29b-41d4-a716-b51f086c1669',
  'text-heading': '550e8400-e29b-41d4-a716-dacc33ed3990',
  video: '550e8400-e29b-41d4-a716-8ec79e32a4bf',
  button: '550e8400-e29b-41d4-a716-0000000003e9',
  card: '550e8400-e29b-41d4-a716-0000000003ea',
  'content-card': '550e8400-e29b-41d4-a716-4c7e60c90439',
  'form-checkbox-group': '550e8400-e29b-41d4-a716-bc6b7b09ebb1',
  'form-checkbox-option': '550e8400-e29b-41d4-a716-653826bd99a3',
  'form-radio-group': '550e8400-e29b-41d4-a716-50d653eebf19',
  'form-radio-option': '550e8400-e29b-41d4-a716-6fbc62ed2b99',
  'fullbleed-teaser': '550e8400-e29b-41d4-a716-0000000003eb',
  'form-controls': '550e8400-e29b-41d4-a716-ac0183893672',
  'form-controls-section': '550e8400-e29b-41d4-a716-2216f5ec662c',
  'form-field-row': '550e8400-e29b-41d4-a716-0ad56ad3cd47',
  'form-input': '550e8400-e29b-41d4-a716-fddc99563a28',
  'form-segmented': '550e8400-e29b-41d4-a716-7f116e554c91',
  'form-select': '550e8400-e29b-41d4-a716-f8e2f06df0c0',
  'form-text-input': '550e8400-e29b-41d4-a716-5b0d897613d9',
  'form-toggle': '550e8400-e29b-41d4-a716-f2a049c2b58c',
  input: '550e8400-e29b-41d4-a716-25e4cf782bd0',
  link: '550e8400-e29b-41d4-a716-9f7d1ebdd36d',
  media: '550e8400-e29b-41d4-a716-fe29d82d680c',
  'new-section': '550e8400-e29b-41d4-a716-588a7f496fd2',
  'product-card': '550e8400-e29b-41d4-a716-37fd3453b6c0',
  'sign-in': '550e8400-e29b-41d4-a716-0000000003ec',
  specimen: '550e8400-e29b-41d4-a716-0000000003ed',
  'specimen-section': '550e8400-e29b-41d4-a716-ed8046c36daa',
  textarea: '550e8400-e29b-41d4-a716-938b3e6cebc9',
  'variant-input': '550e8400-e29b-41d4-a716-a39ec217ccbb',
  imageRoot: '550e8400-e29b-41d4-a716-000000000003',
  buttonRoot: '550e8400-e29b-41d4-a716-000000000065',
  cardRoot: '550e8400-e29b-41d4-a716-000000000067',
  cardEyebrow: '550e8400-e29b-41d4-a716-000000000068',
  cardTitle: '550e8400-e29b-41d4-a716-000000000069',
  cardBody: '550e8400-e29b-41d4-a716-00000000006a',
  teaserRoot: '550e8400-e29b-41d4-a716-00000000006b',
  teaserImage: '550e8400-e29b-41d4-a716-00000000006c',
  teaserTitle: '550e8400-e29b-41d4-a716-00000000006d',
  teaserBody: '550e8400-e29b-41d4-a716-00000000006e',
  formRoot: '550e8400-e29b-41d4-a716-00000000006f',
  specimenRoot: '550e8400-e29b-41d4-a716-000000000070',
} as const;

export const exampleCatalog = {
  atoms,
  components,
  pages,
  schemas,
  tokens,
  fonts,
  globalStyles,
} satisfies ProjectCatalog;

export function createExampleCatalog(): ProjectCatalog {
  return structuredClone(exampleCatalog);
}

export function exampleCatalogDefinitions(): NodeDefinition[] {
  return [...Object.values(atoms), ...Object.values(components), ...Object.values(pages)];
}

export function exampleCatalogLayers(definition: NodeDefinition) {
  const layers: { uuid: string; label: string }[] = [];
  const visit = (current: Node, parent = '') => {
    const rawName = current.data?.name;
    const name = typeof rawName === 'string' && rawName.trim() ? rawName : current.dom.tagName;
    const label = parent ? `${parent} / ${name}` : name;
    layers.push({ uuid: current.uuid, label });
    for (const child of current.dom.children ?? []) visit(child, label);
  };
  visit(definition.root);
  return layers;
}
