import type { FlatDocument, FlatNode, JsonValue } from '@facadeur/core';
import * as Y from 'yjs';
import {
  readEvents,
  readExpose,
  readFields,
  readFonts,
  readIcons,
  readNode,
  readPreviewData,
  readSettings,
  readStyleBlock,
  readTokenInterface,
  readComponentTokens,
  readVariantPresets,
  readVariants,
} from './codec-decode';
import {
  syncEvents,
  syncFields,
  syncFonts,
  syncIcons,
  syncMeta,
  syncNodes,
  syncSettings,
  syncVariants,
} from './codec-encode';
import {
  optionalString,
  readJsonObject,
  stringValue,
  syncJsonArray,
  syncJsonObject,
} from './codec-shared';

/** Write `next` into the Y.Doc, updating existing maps and child arrays in place. */
export function patchDocument(doc: Y.Doc, next: FlatDocument): void {
  syncMeta(doc.getMap('meta'), next);
  syncSettings(doc.getMap('settings'), next.settings);
  syncFields(doc.getArray<Y.Map<unknown>>('fields'), next.fields);
  syncEvents(doc.getArray<Y.Map<unknown>>('events'), next.events ?? []);
  syncVariants(doc.getArray<Y.Map<unknown>>('variants'), next.variants);
  syncJsonArray(
    doc.getArray<unknown>('variantPresets'),
    (next.variantPresets ?? []) as unknown as JsonValue[],
  );
  syncNodes(doc.getMap<Y.Map<unknown>>('nodes'), next);
  syncJsonObject(doc.getMap('tokens'), next.tokens);
  syncFonts(doc.getMap('fonts'), next.fonts);
  syncIcons(doc.getArray<Y.Map<unknown>>('icons'), next.icons ?? []);
  syncJsonObject(doc.getMap('styles'), (next.styles ?? {}) as Record<string, JsonValue>);
  syncJsonObject(
    doc.getMap('tokenInterface'),
    (next.tokenInterface ?? {}) as Record<string, JsonValue>,
  );
  syncJsonObject(
    doc.getMap('componentTokens'),
    (next.componentTokens ?? {}) as unknown as Record<string, JsonValue>,
  );
  syncJsonObject(doc.getMap('expose'), (next.expose ?? {}) as Record<string, JsonValue>);
  syncJsonObject(doc.getMap('previewData'), (next.previewData ?? {}) as Record<string, JsonValue>);
  syncJsonObject(doc.getMap('variantLabels'), next.variantLabels ?? {});
  syncJsonObject(
    doc.getMap('schemaCatalog'),
    (next.schemaCatalog ?? {}) as unknown as Record<string, JsonValue>,
  );
  syncJsonObject(
    doc.getMap('schemaUse'),
    (next.schemaUse ?? {}) as unknown as Record<string, JsonValue>,
  );
}

export function readDocument(doc: Y.Doc): FlatDocument {
  const meta = doc.getMap('meta');
  const nodes: Record<string, FlatNode> = {};
  for (const [id, map] of doc.getMap<Y.Map<unknown>>('nodes').entries()) {
    nodes[id] = readNode(map);
  }
  const schemaCatalog = readJsonObject(doc.getMap('schemaCatalog'));
  const schemaUse = readJsonObject(doc.getMap('schemaUse'));
  return {
    version: 1,
    id: stringValue(meta.get('id')),
    name: stringValue(meta.get('name')),
    ...(optionalString(meta.get('slug')) ? { slug: optionalString(meta.get('slug')) } : {}),
    kind: stringValue(meta.get('kind')),
    ...(optionalString(meta.get('group')) ? { group: optionalString(meta.get('group')) } : {}),
    rootId: stringValue(meta.get('rootId')),
    fields: readFields(doc.getArray<Y.Map<unknown>>('fields')),
    ...(readEvents(doc.getArray<Y.Map<unknown>>('events')).length
      ? { events: readEvents(doc.getArray<Y.Map<unknown>>('events')) }
      : {}),
    variants: readVariants(doc.getArray<Y.Map<unknown>>('variants')),
    ...readVariantPresets(doc.getArray<unknown>('variantPresets')),
    settings: readSettings(doc.getMap('settings')),
    tokens: readJsonObject(doc.getMap('tokens')),
    fonts: readFonts(doc.getMap('fonts')),
    icons: readIcons(doc.getArray<Y.Map<unknown>>('icons')),
    ...readStyleBlock(doc.getMap('styles')),
    ...readTokenInterface(doc.getMap('tokenInterface')),
    ...readComponentTokens(doc.getMap('componentTokens')),
    ...readExpose(doc.getMap('expose')),
    ...readPreviewData(doc.getMap('previewData')),
    ...(Object.keys(readJsonObject(doc.getMap('variantLabels'))).length
      ? { variantLabels: readJsonObject(doc.getMap('variantLabels')) as Record<string, string> }
      : {}),
    ...(Object.keys(schemaCatalog).length
      ? { schemaCatalog: schemaCatalog as unknown as FlatDocument['schemaCatalog'] }
      : {}),
    ...(Object.keys(schemaUse).length
      ? { schemaUse: schemaUse as unknown as FlatDocument['schemaUse'] }
      : {}),
    nodes,
  };
}

export function ensureDocumentMaps(doc: Y.Doc): void {
  doc.getMap('meta');
  doc.getMap('settings');
  doc.getArray('fields');
  doc.getArray('events');
  doc.getArray('variants');
  doc.getArray('variantPresets');
  doc.getMap('nodes');
  doc.getMap('tokens');
  doc.getMap('fonts');
  doc.getArray('icons');
  doc.getMap('styles');
  doc.getMap('tokenInterface');
  doc.getMap('componentTokens');
  doc.getMap('expose');
  doc.getMap('previewData');
  doc.getMap('variantLabels');
  doc.getMap('schemaCatalog');
  doc.getMap('schemaUse');
}
