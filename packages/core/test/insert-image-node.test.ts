import { describe, expect, it } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { createProjectTemplate } from '@facadeur/tokens';
import { IMAGE_ATOM_UUID, imageAtomDefinition, seedProjectCatalog } from '@facadeur/api/server';
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

const imageSchemaUuid = '550e8400-e29b-41d4-a716-446655440001';

describe('insert image node validation', () => {
  it('validates catalog after inserting an img primitive', () => {
    const defUuid = createCatalogUuid();
    const rootUuid = createCatalogUuid();
    const imgUuid = createCatalogUuid();
    const catalog = validateProjectCatalog({
      atoms: {},
      components: {
        [defUuid]: {
          uuid: defUuid,
          name: 'Card',
          kind: 'component',
          schema: {
            kind: 'inline',
            schema: { type: 'object', properties: {} },
          },
          root: {
            uuid: rootUuid,
            dom: { tagName: 'div', children: [] },
          },
        },
      },
      pages: {},
      schemas: {
        [imageSchemaUuid]: {
          type: 'object',
          properties: { src: { type: 'string' } },
        },
      },
    });

    const imgNode = {
      uuid: imgUuid,
      dom: { tagName: 'img', attributes: { src: '', alt: '' } },
    };
    const next = insertCatalogNode(catalog, defUuid, rootUuid, 0, imgNode);
    expect(() => validateProjectCatalog(next)).not.toThrow();
  });

  it('validates seeded catalog after CoreController inserts img', () => {
    const template = createProjectTemplate();
    const defUuid = createCatalogUuid();
    const rootUuid = createCatalogUuid();
    const catalog = validateProjectCatalog({
      atoms: {},
      components: {
        [defUuid]: {
          uuid: defUuid,
          name: 'Card',
          kind: 'component',
          schema: { kind: 'inline', schema: { type: 'object', properties: {} } },
          root: { uuid: rootUuid, dom: { tagName: 'div', children: [] } },
        },
      },
      pages: {},
      tokens: template.tokens,
      fonts: template.fonts,
      globalStyles: { breakpoints: template.breakpoints },
    });
    const core = new CoreController(catalog);
    core.openDefinition(defUuid);
    const imgUuid = createCatalogUuid();
    expect(() =>
      core.insertCatalogNode(rootUuid, 0, {
        uuid: imgUuid,
        dom: { tagName: 'img', attributes: { src: '', alt: '' } },
      }),
    ).not.toThrow();
  });

  it('rejects null field values', () => {
    expect(Value.Check(fieldValueSchema, null)).toBe(false);
  });

  it('inserts img into API seed catalog', () => {
    const catalog = validateProjectCatalog(seedProjectCatalog());
    const pageOrComponent = Object.values(catalog.components)[0] ?? Object.values(catalog.atoms)[0];
    expect(pageOrComponent).toBeDefined();
    const rootUuid = pageOrComponent!.root.uuid;
    const imgUuid = createCatalogUuid();
    const next = insertCatalogNode(catalog, pageOrComponent!.uuid, rootUuid, 0, {
      uuid: imgUuid,
      dom: { tagName: 'img', attributes: { src: '', alt: '' } },
    });
    expect(() => validateProjectCatalog(next)).not.toThrow();
  });

  it('validates node data without null', () => {
    const defUuid = createCatalogUuid();
    const rootUuid = createCatalogUuid();
    const catalog = {
      atoms: {},
      components: {
        [defUuid]: {
          uuid: defUuid,
          name: 'Card',
          kind: 'component',
          schema: { kind: 'inline', schema: { type: 'object', properties: {} } },
          root: {
            uuid: rootUuid,
            dom: { tagName: 'div', children: [] },
            data: { alt: 'ok' },
          },
        },
      },
      pages: {},
    };
    const errors = [...Value.Errors(projectCatalogSchema, catalog)];
    expect(errors.map((e) => `${e.path} ${e.message}`).join('; ')).toBe('');
    expect(() => validateProjectCatalog(catalog)).not.toThrow();
  });

  it('sanitize removes null from node data', () => {
    const defUuid = createCatalogUuid();
    const rootUuid = createCatalogUuid();
    const raw = {
      atoms: {},
      components: {
        [defUuid]: {
          uuid: defUuid,
          name: 'Card',
          kind: 'component',
          schema: { kind: 'inline', schema: { type: 'object', properties: {} } },
          root: {
            uuid: rootUuid,
            dom: { tagName: 'div', children: [] },
            data: { src: null, alt: 'ok' },
          },
        },
      },
      pages: {},
    };
    const sanitized = sanitizeProjectCatalog(raw as never);
    expect(sanitized.components[defUuid]?.root.data).toEqual({ alt: 'ok' });
    expect(() => Value.Check(projectCatalogSchema, sanitized)).not.toThrow();
  });

  it('strips null node data so insert validation succeeds', () => {
    const defUuid = createCatalogUuid();
    const rootUuid = createCatalogUuid();
    const imgUuid = createCatalogUuid();
    const catalog = validateProjectCatalog({
      atoms: {},
      components: {
        [defUuid]: {
          uuid: defUuid,
          name: 'Card',
          kind: 'component',
          schema: { kind: 'inline', schema: { type: 'object', properties: {} } },
          root: {
            uuid: rootUuid,
            dom: { tagName: 'div', children: [] },
            data: { src: null, alt: 'ok' },
          },
        },
      },
      pages: {},
    });
    expect(catalog.components[defUuid]?.root.data).toEqual({ alt: 'ok' });
    const next = insertCatalogNode(catalog, defUuid, rootUuid, 0, {
      uuid: imgUuid,
      dom: { tagName: 'img', attributes: { src: '', alt: '' } },
    });
    expect(() => validateProjectCatalog(next)).not.toThrow();
  });

  it('renders catalog atom instances as images in preview config', () => {
    const catalog = validateProjectCatalog(seedProjectCatalog());
    const componentUuid = createCatalogUuid();
    const rootUuid = createCatalogUuid();
    const instanceUuid = createCatalogUuid();
    const withInstance = validateProjectCatalog({
      ...catalog,
      components: {
        [componentUuid]: {
          uuid: componentUuid,
          name: 'Card',
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
                  config: { definitionRef: IMAGE_ATOM_UUID },
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
    expect(child?.attributes?.src).toContain('placehold.co');
    expect(child?.nodeUuid).toBe(instanceUuid);
  });
});
