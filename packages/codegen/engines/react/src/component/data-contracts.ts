import {
  structuralChildSchemas,
  type NestedNode,
  type SchemaCatalog,
  type SchemaResolverContext,
} from '@facadeur/core';
import { CodegenError, componentName, quote } from '../names';
import { schemaTypeName } from './catalog-fields';
import type { CatalogEntry } from './types';

/** Emit authored catalog types and connect component contracts to their schema owner. */
export function assignDataContracts(
  catalog: Map<string, CatalogEntry>,
  schemas: SchemaCatalog | undefined,
  context: SchemaResolverContext,
) {
  const names = new Map<string, string>();
  const used = new Set<string>();
  for (const schema of schemas?.schemas ?? []) {
    names.set(schema.id, componentName(`${schema.id}-schema`, used));
  }
  const files = (schemas?.schemas ?? []).map((schema) => {
    const imports = new Set<string>();
    const type = schemaTypeName(schema.schema, (value) => {
      if (!value.$ref) return undefined;
      const id = value.$ref.replace('facadeur://schema/', '');
      const name = names.get(id);
      if (!name) throw new CodegenError(`Unknown schema reference "${value.$ref}"`);
      if (id !== schema.id) imports.add(`import type { ${name} } from './${name}';`);
      return name;
    });
    const name = names.get(schema.id)!;
    return {
      path: `types/${name}.ts`,
      contents: `${banner}\n${[...imports].join('\n')}\nexport type ${name} = ${type};\n`,
    };
  });
  if (files.length) {
    files.push({
      path: 'types/index.ts',
      contents: `${banner}\n${[...names.values()].map((name) => `export type { ${name} } from './${name}';`).join('\n')}\n`,
    });
  }
  for (const entry of catalog.values()) {
    const imports = new Set<string>();
    const bases: string[] = [];
    const inherited = new Set<string>();
    const aliases: string[] = [];
    const branchTypes = new Map<string, string>();
    const aliasNames = new Set([`${entry.component}Data`, `${entry.component}Props`]);
    visitStructural(entry.document.root, (node) => {
      for (const branch of structuralChildSchemas(entry.document, node.id, context)) {
        const target = catalog.get(branch.node.component);
        if (!target || [...target.fields.values()].some((field) => field.name !== field.source)) {
          continue;
        }
        const key = JSON.stringify(branch.schema);
        if (branchTypes.has(key)) continue;
        const alias = componentName(`${target.component}-item`, aliasNames);
        const data = `${target.component}Data`;
        if (target !== entry) {
          imports.add(`import type { ${data} } from '../${target.component}/types';`);
        }
        aliases.push(
          `export interface ${alias} { type: ${quote(branch.caseValue)}; props: ${data}; }`,
        );
        branchTypes.set(key, alias);
      }
    });
    for (const [fieldName, prop] of entry.fields) {
      const field = entry.contractFields.get(fieldName);
      if (field?.schema) {
        prop.type = schemaTypeName(field.schema, (value) => branchTypes.get(JSON.stringify(value)));
      }
    }
    const direct = entry.document.schemaUse?.fields?.length
      ? undefined
      : entry.document.schemaUse?.direct;
    const named =
      direct?.kind === 'schema'
        ? schemas?.schemas.find((schema) => schema.id === direct.schemaId)
        : undefined;
    // Plain object assignments can inherit unchanged properties. Defaulted/renamed fields
    // stay local so the component's effective optionality and safe prop names are preserved.
    if (
      named?.schema.properties &&
      !named.schema.oneOf &&
      !named.schema.anyOf &&
      !named.schema.allOf
    ) {
      const type = names.get(named.id)!;
      const keys: string[] = [];
      for (const prop of entry.fields.values()) {
        if (!named.schema.properties[prop.source] || prop.name !== prop.source) continue;
        if (prop.type !== schemaTypeName(named.schema.properties[prop.source]!)) continue;
        const required = named.schema.required?.includes(prop.source) === true;
        if ((prop.required === true) !== required) continue;
        inherited.add(prop.name);
        keys.push(quote(prop.source));
      }
      if (keys.length) {
        imports.add(`import type { ${type} } from '../../types/${type}';`);
        bases.push(`Pick<${type}, ${keys.join(' | ')}>`);
      }
    }
    if (named && !named.schema.properties && entry.fields.has('value')) {
      const type = names.get(named.id)!;
      imports.add(`import type { ${type} } from '../../types/${type}';`);
      entry.fields.get('value')!.type = type;
    }
    for (const assignment of entry.document.schemaUse?.fields ?? []) {
      if (assignment.type.kind !== 'schema') continue;
      const prop = entry.fields.get(assignment.name);
      const type = names.get(assignment.type.schemaId);
      if (!prop || !type) continue;
      imports.add(`import type { ${type} } from '../../types/${type}';`);
      prop.type = type;
    }
    entry.dataContract = {
      imports: [...imports],
      bases,
      fields: [...entry.fields.values()].filter((prop) => !inherited.has(prop.name)),
      aliases,
    };
  }
  return files;
}

const banner =
  '/** Generated by @facadeur/codegen-react from the schema catalog. Do not edit by hand. */';

function visitStructural(node: NestedNode, visit: (node: NestedNode) => void): void {
  if (node.type === 'repeater' || node.type === 'switch') visit(node);
  if (node.type === 'frame' || node.type === 'repeater' || node.type === 'switch') {
    for (const child of node.children ?? []) visitStructural(child, visit);
  }
}
