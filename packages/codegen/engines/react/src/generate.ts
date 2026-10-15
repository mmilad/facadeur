import {
  resolveDefinitionToElementBuildConfig,
  readTokenTree,
  componentPropsForSchema,
  resolveJsonSchemaForDefinition,
  tokenCustomProperty,
} from '@facadeur/core';
import type { ElementBuildConfig, Node, ProjectCatalog } from '@facadeur/domain';
import { renderBoxSizingReset, renderDesignCss, renderGlobalStyleCss } from '@facadeur/style-engine';
import { catalogEntries } from '../../../src/catalog';
import { CodegenError } from '../../../src/error';
import type {
  GenerateOptions,
  GenerateOutput,
  GeneratedComponent,
  GeneratedFile,
} from '../../../src/types';

export function generateReact(options: GenerateOptions): GenerateOutput {
  const entries = catalogEntries(options.catalog, options.entries);
  const ui: GeneratedFile[] = [];
  const stories: GeneratedFile[] = [];
  const components: GeneratedComponent[] = [];
  const cssRules: string[] = [];
  const tokenIndex = readTokenTree(options.catalog.tokens ?? {});
  const tokensByUuid = new Map(
    [...tokenIndex.tokens].map(([uuid, token]) => [uuid, tokenCustomProperty(token.path)]),
  );

  for (const entry of entries) {
    const tree = resolveDefinitionToElementBuildConfig(entry.definition, options.catalog);
    const schema = resolveJsonSchemaForDefinition(options.catalog, entry.definition);
    const propPaths = new Map(
      componentPropsForSchema(schema).map((prop) => [prop.uuid, prop.name.slice('props.'.length)]),
    );
    const component = renderComponent(
      entry.exportName,
      entry.definition.uuid,
      tree,
      tokensByUuid,
      propPaths,
      entry.definition.root,
      schema,
    );
    ui.push({ path: `components/${entry.directory}/index.tsx`, contents: component.contents });
    cssRules.push(component.css);
    stories.push({
      path: `src/stories/generated/${entry.directory}.stories.tsx`,
      contents: renderStory(
        entry.exportName,
        entry.definition.name,
        entry.definition.config?.previewData?.fields ?? {},
      ),
    });
    components.push({
      exportName: entry.exportName,
      title: entry.definition.name,
      props: entry.definition.config?.previewData?.fields ?? {},
    });
  }

  cssRules.unshift(renderBoxSizingReset());
  cssRules.push(renderGlobalStyleCss(options.catalog));

  const breakpoints = options.catalog.globalStyles?.breakpoints;
  ui.push({
    path: 'styles/design-tokens.css',
    contents: renderDesignCss({
      ...(options.catalog.tokens ? { tokens: options.catalog.tokens } : {}),
      ...(breakpoints ? { breakpoints } : {}),
    }),
  });
  ui.push({
    path: 'styles/components.css',
    contents: `${cssRules.filter(Boolean).join('\n\n')}\n`,
  });
  ui.push({
    path: 'index.ts',
    contents: renderIndex(entries),
  });
  return { ui, stories, components };
}

function renderComponent(
  exportName: string,
  uuid: string,
  tree: ElementBuildConfig,
  tokenProperties: ReadonlyMap<string, string>,
  propPaths: ReadonlyMap<string, string>,
  sourceRoot: Node,
  schema: unknown,
) {
  const cssRules: string[] = [];
  const sourceNodes = new Map<string, Node>();
  const collect = (node: Node) => {
    sourceNodes.set(node.uuid, node);
    for (const child of node.dom.children ?? []) collect(child);
  };
  collect(sourceRoot);
  const jsx = renderNode(tree, tokenProperties, propPaths, sourceNodes, cssRules);
  const propsType = schemaType(schema);
  const propsAreOptional = !schemaHasRequiredProperties(schema);
  const source = [
    `/// <reference path="../../styles.d.ts" />`,
    `import '../../styles/components.css';`,
    `import '../../styles/design-tokens.css';`,
    '',
    `export type ${exportName}Props = ${propsType};`,
    '',
    `/** Generated from Catalog definition ${uuid}. */`,
    `export function ${exportName}(props: ${exportName}Props${propsAreOptional ? ' = {}' : ''}) {`,
    `  return ${jsx};`,
    '}',
    '',
    'function getProp(props: object, path: string) {',
    '  let value: unknown = props;',
    '  for (const segment of path.split(".")) {',
    '    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;',
    '    value = (value as Record<string, unknown>)[segment];',
    '  }',
    '  return value;',
    '}',
    '',
  ].join('\n');
  return { contents: source, css: cssRules.join('\n') };
}

function schemaHasRequiredProperties(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return false;
  const record = schema as Record<string, unknown>;
  if (Array.isArray(record.required) && record.required.length > 0) return true;
  for (const key of ['allOf', 'anyOf', 'oneOf']) {
    const branches = record[key];
    if (Array.isArray(branches) && branches.some(schemaHasRequiredProperties)) return true;
  }
  return false;
}

function schemaType(schema: unknown): string {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return 'Readonly<Record<string, unknown>>';
  }
  const record = schema as Record<string, unknown>;
  if (record.const !== undefined) return JSON.stringify(record.const);
  if (Array.isArray(record.enum) && record.enum.length) {
    return record.enum.map((value) => JSON.stringify(value)).join(' | ');
  }
  const branches = Array.isArray(record.anyOf)
    ? record.anyOf
    : Array.isArray(record.oneOf)
      ? record.oneOf
      : undefined;
  if (branches?.length) return branches.map(schemaType).join(' | ');
  if (Array.isArray(record.allOf) && record.allOf.length) {
    return record.allOf.map(schemaType).join(' & ');
  }
  const types = Array.isArray(record.type)
    ? record.type
    : typeof record.type === 'string'
      ? [record.type]
      : [];
  if (types.length > 1) return types.map((type) => schemaType({ ...record, type })).join(' | ');
  const type = types[0];
  if (type === 'string') return 'string';
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'null') return 'null';
  if (type === 'array') {
    const item = schemaType(record.items);
    return `${item.includes(' | ') || item.includes(' & ') ? `(${item})` : item}[]`;
  }
  if (type === 'object' || (record.properties && typeof record.properties === 'object')) {
    const properties = Object.entries(record.properties ?? {}).map(([name, property]) => {
      const optional = Array.isArray(record.required) && record.required.includes(name) ? '' : '?';
      return `${JSON.stringify(name)}${optional}: ${schemaType(property)}`;
    });
    if (!properties.length) return 'Readonly<Record<string, unknown>>';
    if (record.additionalProperties === true || record.additionalProperties === undefined) {
      properties.push('[key: string]: unknown');
    } else if (
      record.additionalProperties &&
      typeof record.additionalProperties === 'object' &&
      !Array.isArray(record.additionalProperties)
    ) {
      properties.push(`[key: string]: ${schemaType(record.additionalProperties)}`);
    }
    return `Readonly<{ ${properties.join('; ')} }>`;
  }
  return 'Readonly<Record<string, unknown>>';
}

function renderNode(
  node: ElementBuildConfig,
  tokenProperties: ReadonlyMap<string, string>,
  propPaths: ReadonlyMap<string, string>,
  sourceNodes: ReadonlyMap<string, Node>,
  cssRules: string[],
): string {
  const source = node.nodeUuid ? sourceNodes.get(node.nodeUuid) : undefined;
  const declarations = Object.entries(node.dynamicStyle ?? {}).map(
    ([property, value]) => `  ${kebab(property)}: ${cssValue(value, tokenProperties)};`,
  );
  if (declarations.length) {
    const selector = node.nodeUuid ? `[data-facadeur-codegen-node="${node.nodeUuid}"]` : '.node';
    cssRules.push(`${selector} {\n${declarations.join('\n')}\n}`);
  }
  const attributes: Record<string, unknown> = {
    ...node.attributes,
    ...Object.fromEntries(
      Object.entries(node.dataset ?? {}).map(([key, value]) => [`data-${key}`, value]),
    ),
    ...(node.properties ?? {}),
  };
  if (node.nodeUuid) {
    attributes['data-facadeur-codegen-node'] = node.nodeUuid;
  }
  const styleNodeUuids = new Set([
    ...(node.styleNodeUuids ?? []),
    ...(node.nodeUuid ? [node.nodeUuid] : []),
  ]);
  if (styleNodeUuids.size) {
    const classKey = Object.hasOwn(attributes, 'className') ? 'className' : 'class';
    const existingClass = attributes[classKey];
    const generatedClasses = [...styleNodeUuids].map((nodeUuid) => `facadeur-node-${nodeUuid}`);
    attributes[classKey] =
      typeof existingClass === 'string' && existingClass.length
        ? `${existingClass} ${generatedClasses.join(' ')}`
        : generatedClasses.join(' ');
  }
  if (declarations.length) {
    if (!node.nodeUuid) attributes.className = 'node';
  }
  const props = Object.entries(attributes)
    .map(
      ([key, value]) =>
        ` ${reactAttribute(key)}=${jsxValue(reactValue(reactAttribute(key), value), source?.dom.attributes?.[key], propPaths)}`,
    )
    .join('');
  const tag = safeTag(node.tagName);
  if (isVoidTag(tag)) return `<${tag}${props} />`;
  const content = node.text === undefined ? '' : jsxValue(node.text, source?.dom.text, propPaths);
  const children = (node.children ?? [])
    .map((child) => renderNode(child, tokenProperties, propPaths, sourceNodes, cssRules))
    .join('');
  return `<${tag}${props}>${content}${children}</${tag}>`;
}

function jsxValue(value: unknown, source: unknown, propPaths: ReadonlyMap<string, string>) {
  if (typeof source === 'string') {
    const match = source.match(/^\{props:([^}]+)\}$/);
    const path = match?.[1] ? propPaths.get(match[1]) : undefined;
    if (path && match) {
      const fallback = value === match[0] ? undefined : value;
      const convert =
        typeof value === 'boolean' ? 'Boolean' : typeof value === 'number' ? 'Number' : 'String';
      return `{${convert}(getProp(props, ${JSON.stringify(path)}) ?? ${JSON.stringify(fallback ?? '')})}`;
    }
  }
  return `{${JSON.stringify(value)}}`;
}

function renderStory(component: string, title: string, args: Readonly<Record<string, unknown>>) {
  const escaped = JSON.stringify(title);
  return [
    `import type { Meta, StoryObj } from '@storybook/react';`,
    `import { ${component} } from '@facadeur/ui';`,
    '',
    `const meta = { title: ${escaped}, component: ${component}, args: ${JSON.stringify(args)} } satisfies Meta<typeof ${component}>;`,
    'export default meta;',
    'type Story = StoryObj<typeof meta>;',
    'export const Default: Story = {};',
    '',
  ].join('\n');
}

function renderIndex(entries: ReturnType<typeof catalogEntries>) {
  return [
    '/** Generated from the canonical ProjectCatalog. */',
    ...entries.map(
      (entry) =>
        `export { ${entry.exportName}, type ${entry.exportName}Props } from './components/${entry.directory}';`,
    ),
    '',
  ].join('\n');
}

function cssValue(value: string, tokenProperties: ReadonlyMap<string, string>) {
  return value.replace(/\{token:([^}]+)\}/g, (_match, uuid: string) =>
    tokenProperties.has(uuid) ? `var(${tokenProperties.get(uuid)})` : `var(--token-${uuid})`,
  );
}

function kebab(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function reactAttribute(value: string) {
  if (value === 'class') return 'className';
  if (value === 'for') return 'htmlFor';
  if (value === 'autocomplete') return 'autoComplete';
  if (value === 'readonly') return 'readOnly';
  if (value === 'tabindex') return 'tabIndex';
  if (value === 'maxlength') return 'maxLength';
  if (value === 'minlength') return 'minLength';
  return value.replace(/^aria-/, 'aria-').replace(/^data-/, 'data-');
}

function reactValue(key: string, value: unknown) {
  if (typeof value !== 'string') return value;
  if (
    [
      'rows',
      'cols',
      'size',
      'span',
      'rowSpan',
      'colSpan',
      'tabIndex',
      'maxLength',
      'minLength',
    ].includes(key)
  ) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
    // Invalid HTML numeric attributes have no numeric DOM value to preserve.
    return undefined;
  }
  if (
    [
      'controls',
      'autoPlay',
      'loop',
      'muted',
      'multiple',
      'disabled',
      'checked',
      'required',
      'readOnly',
    ].includes(key)
  ) {
    return true;
  }
  return value;
}

function safeTag(value: string) {
  if (!/^[A-Za-z][A-Za-z0-9.-]*$/.test(value))
    throw new CodegenError(`Invalid element tag "${value}"`);
  return value;
}

function isVoidTag(tag: string) {
  return new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]).has(tag.toLowerCase());
}

export function generateCatalogReact(catalog: ProjectCatalog, entries?: readonly string[]) {
  return generateReact({ catalog, ...(entries ? { entries } : {}) });
}
