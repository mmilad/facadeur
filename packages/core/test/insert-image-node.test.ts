import { describe, expect, it } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { createExampleCatalog } from '@facadeur/examples';
import { createCatalogUuid } from '../src/document/ids';
import { sanitizeProjectCatalog } from '../src/controller/project/catalog/sanitize-field-values';
import {
  CoreController,
  definitionToElementBuildConfig,
  insertCatalogNode,
  validateProjectCatalog,
} from '../src/index';
import { fieldValueSchema } from '../src/schema/fields';
import { projectCatalogSchema } from '../src/schema/node-model/catalog';

function minimalComponentCatalog(data?: Record<string, unknown>) {
  const definitionUuid = createCatalogUuid();
  const rootUuid = createCatalogUuid();
  return {
    definitionUuid,
    rootUuid,
    catalog: {
      atoms: {},
      components: {
        [definitionUuid]: {
          uuid: definitionUuid,
          name: 'Test component',
          kind: 'component' as const,
          schema: { kind: 'inline' as const, schema: { type: 'object' as const, properties: {} } },
          root: {
            uuid: rootUuid,
            dom: { tagName: 'div' },
            ...(data ? { data } : {}),
          },
        },
      },
      pages: {},
    },
  };
}

describe('insert image node validation', () => {
  it('validates the example catalog after inserting an img primitive', () => {
    const catalog = createExampleCatalog();
    const card = Object.values(catalog.components).find((definition) => definition.name === 'Card');
    if (!card) throw new Error('Example catalog is missing the Card component');

    const next = insertCatalogNode(catalog, card.uuid, card.root.uuid, 0, {
      uuid: createCatalogUuid(),
      dom: { tagName: 'img', attributes: { src: '', alt: '' } },
    });
    expect(() => validateProjectCatalog(next)).not.toThrow();
  });

  it('validates the example catalog after CoreController inserts img', () => {
    const catalog = createExampleCatalog();
    const card = Object.values(catalog.components).find((definition) => definition.name === 'Card');
    if (!card) throw new Error('Example catalog is missing the Card component');

    const core = new CoreController(catalog);
    core.openDefinition(card.uuid);
    expect(() =>
      core.insertCatalogNode(card.root.uuid, 0, {
        uuid: createCatalogUuid(),
        dom: { tagName: 'img', attributes: { src: '', alt: '' } },
      }),
    ).not.toThrow();
  });

  it('rejects null field values', () => {
    expect(Value.Check(fieldValueSchema, null)).toBe(false);
  });

  it('validates node data without null', () => {
    const { catalog } = minimalComponentCatalog({ alt: 'ok' });
    expect([...Value.Errors(projectCatalogSchema, catalog)]).toEqual([]);
    expect(() => validateProjectCatalog(catalog)).not.toThrow();
  });

  it('sanitize removes null from node data', () => {
    const { catalog, definitionUuid } = minimalComponentCatalog({ src: null, alt: 'ok' });
    const sanitized = sanitizeProjectCatalog(catalog as never);
    expect(sanitized.components[definitionUuid]?.root.data).toEqual({ alt: 'ok' });
    expect(Value.Check(projectCatalogSchema, sanitized)).toBe(true);
  });

  it('strips null node data so insert validation succeeds', () => {
    const { catalog, definitionUuid, rootUuid } = minimalComponentCatalog({ src: null, alt: 'ok' });
    const validCatalog = validateProjectCatalog(catalog);
    expect(validCatalog.components[definitionUuid]?.root.data).toEqual({ alt: 'ok' });
    const next = insertCatalogNode(validCatalog, definitionUuid, rootUuid, 0, {
      uuid: createCatalogUuid(),
      dom: { tagName: 'img', attributes: { src: '', alt: '' } },
    });
    expect(() => validateProjectCatalog(next)).not.toThrow();
  });

  it('renders example image atom instances as images in preview config', () => {
    const catalog = createExampleCatalog();
    const image = Object.values(catalog.atoms).find((definition) => definition.name === 'Image');
    if (!image) throw new Error('Example catalog is missing the Image atom');

    const componentUuid = createCatalogUuid();
    const rootUuid = createCatalogUuid();
    const instanceUuid = createCatalogUuid();
    const withInstance = validateProjectCatalog({
      ...catalog,
      components: {
        ...catalog.components,
        [componentUuid]: {
          uuid: componentUuid,
          name: 'Image wrapper',
          kind: 'component',
          schema: { kind: 'inline', schema: { type: 'object', properties: {} } },
          root: {
            uuid: rootUuid,
            dom: {
              tagName: 'div',
              children: [
                {
                  uuid: instanceUuid,
                  dom: { tagName: 'div', children: [] },
                  config: { definitionRef: image.uuid },
                },
              ],
            },
          },
        },
      },
    });
    const config = definitionToElementBuildConfig(
      withInstance.components[componentUuid]!,
      withInstance,
    );
    const child = config.children?.[0];
    expect(child?.tagName).toBe('img');
    expect(child?.attributes?.src).toContain('data:image/svg+xml');
    expect(child?.nodeUuid).toBe(instanceUuid);
  });
});
