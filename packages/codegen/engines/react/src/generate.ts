import {
  resolveDefinitionToElementBuildConfig,
  readTokenTree,
  componentPropsForSchema,
  resolveJsonSchemaForDefinition,
  tokenCustomProperty,
} from '@facadeur/core';
import type { ComponentBehavior, Node, ProjectCatalog, RenderBuildConfig } from '@facadeur/domain';
import {
  renderBoxSizingReset,
  renderDesignCss,
  renderGlobalStyleCss,
} from '@facadeur/style-engine';
import { catalogEntries } from '../../../src/catalog';
import { CodegenError } from '../../../src/error';
import type {
  GenerateOptions,
  GenerateOutput,
  GeneratedComponent,
  GeneratedFile,
} from '../../../src/types';
import {
  childRepeaterScopes,
  classExpression,
  classSelector,
  type CodegenRepeaterScope,
} from './class-conditions';
import { behaviorHandlerName, renderBehavior } from './behavior';

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
      componentPropsForSchema(schema).map((prop) => [prop.uuid, prop.path]),
    );
    const booleanPropUuids = new Set(
      componentPropsForSchema(schema)
        .filter((prop) => prop.valueType === 'boolean')
        .map((prop) => prop.uuid),
    );
    const component = renderComponent(
      entry.exportName,
      entry.definition.uuid,
      tree,
      tokensByUuid,
      propPaths,
      booleanPropUuids,
      entry.definition.root,
      schema,
      entry.definition.behavior,
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
  tree: RenderBuildConfig,
  tokenProperties: ReadonlyMap<string, string>,
  propPaths: ReadonlyMap<string, string>,
  booleanPropUuids: ReadonlySet<string>,
  sourceRoot: Node,
  schema: unknown,
  behavior: ComponentBehavior | undefined,
) {
  const cssRules: string[] = [];
  const sourceNodes = new Map<string, Node>();
  const collect = (node: Node) => {
    sourceNodes.set(node.uuid, node);
    for (const child of node.dom.children ?? []) collect(child);
  };
  collect(sourceRoot);
  const jsx = renderNode(
    tree,
    tokenProperties,
    propPaths,
    booleanPropUuids,
    sourceNodes,
    cssRules,
    new Map(),
    behavior,
    new Map(
      Object.keys(behavior?.state ?? {}).map((name, index) => [name, `behaviorState${index}`]),
    ),
  );
  const returnedJsx = tree.kind === 'fragment' ? `<>${jsx}</>` : jsx;
  const callbackProps = new Set(
    (behavior?.transitions ?? []).flatMap((transition) =>
      transition.actions
        .filter((action) => action.kind === 'emit')
        .map((action) => `on${action.name[0]?.toUpperCase() ?? ''}${action.name.slice(1)}`),
    ),
  );
  const propsType = schemaType(schema, callbackProps);
  const propsAreOptional = !schemaHasRequiredProperties(schema);
  const behaviorSource = renderBehavior(behavior, schemaType, jsx.includes('<Fragment'));
  const source = [
    `/// <reference path="../../styles.d.ts" />`,
    ...(behaviorSource.imports.length ? behaviorSource.imports : []),
    `import '../../styles/components.css';`,
    `import '../../styles/design-tokens.css';`,
    '',
    `export type ${exportName}Props = ${propsType};`,
    '',
    `/** Generated from Catalog definition ${uuid}. */`,
    `export function ${exportName}(props: ${exportName}Props${propsAreOptional ? ' = {}' : ''}) {`,
    ...behaviorSource.setup.map((line) => `  ${line}`),
    `  return ${returnedJsx};`,
    '}',
    ...behaviorSource.helpers,
    '',
    'function getProp(props: unknown, path: string) {',
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

function schemaType(schema: unknown, callbackProps: ReadonlySet<string> = new Set()): string {
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
  if (branches?.length)
    return branches.map((branch) => schemaType(branch, callbackProps)).join(' | ');
  if (Array.isArray(record.allOf) && record.allOf.length) {
    return record.allOf.map((branch) => schemaType(branch, callbackProps)).join(' & ');
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
      const isCallback = callbackProps.has(name);
      const optional =
        isCallback || !(Array.isArray(record.required) && record.required.includes(name))
          ? '?'
          : '';
      const propertyType = isCallback
        ? '(...args: any[]) => void'
        : schemaType(property, callbackProps);
      return `${JSON.stringify(name)}${optional}: ${propertyType}`;
    });
    if (!properties.length) return 'Readonly<Record<string, unknown>>';
    if (record.additionalProperties === true || record.additionalProperties === undefined) {
      properties.push('[key: string]: unknown');
    } else if (
      record.additionalProperties &&
      typeof record.additionalProperties === 'object' &&
      !Array.isArray(record.additionalProperties)
    ) {
      properties.push(`[key: string]: ${schemaType(record.additionalProperties, callbackProps)}`);
    }
    return `Readonly<{ ${properties.join('; ')} }>`;
  }
  return 'Readonly<Record<string, unknown>>';
}

function renderNode(
  node: RenderBuildConfig,
  tokenProperties: ReadonlyMap<string, string>,
  propPaths: ReadonlyMap<string, string>,
  booleanPropUuids: ReadonlySet<string>,
  sourceNodes: ReadonlyMap<string, Node>,
  cssRules: string[],
  repeaterScopes: ReadonlyMap<string, CodegenRepeaterScope>,
  behavior?: ComponentBehavior,
  stateIdentifiers: ReadonlyMap<string, string> = new Map(),
): string {
  const source = node.nodeUuid ? sourceNodes.get(node.nodeUuid) : undefined;
  if (node.kind === 'fragment') {
    if (node.repeater) {
      const { source } = node.repeater;
      const sourcePath =
        source.kind === 'prop'
          ? propPaths.get(source.uuid)
          : source.kind === 'item'
            ? [...repeaterScopes.values()].at(-1)?.itemExpression
            : undefined;
      const state =
        source.kind === 'state'
          ? (stateIdentifiers.get(source.name) ?? '[]')
          : source.kind === 'prop'
            ? `getProp(props, ${JSON.stringify(sourcePath ?? '')})`
            : sourcePath
              ? `getProp(${sourcePath}, ${JSON.stringify(source.path)})`
              : '[]';
      const array = `(Array.isArray(${state}) ? ${state} as unknown[] : [])`;
      const arrayPath =
        source.kind === 'state'
          ? `state.${source.name}`
          : source.kind === 'prop'
            ? (sourcePath ?? '')
            : [...repeaterScopes.values()].at(-1)?.arrayPath
              ? `${[...repeaterScopes.values()].at(-1)!.arrayPath}.${source.path}`
              : source.path;
      const dynamicScope: CodegenRepeaterScope = {
        arrayPath,
        itemExpression: 'item',
        index: 0,
        indexExpression: 'index',
        itemPropPaths: new Map(
          componentPropsForSchema(node.repeater.itemSchema).map((prop) => [prop.uuid, prop.path]),
        ),
      };
      const scopes = new Map(repeaterScopes).set(node.nodeUuid ?? '', dynamicScope);
      const templates = node.repeater.templates
        .map((template) =>
          renderNode(
            template,
            tokenProperties,
            propPaths,
            booleanPropUuids,
            sourceNodes,
            cssRules,
            scopes,
            behavior,
            stateIdentifiers,
          ),
        )
        .join('');
      const keyPath =
        source.kind === 'state'
          ? behavior?.stateArrayKeyPaths?.[source.name]
          : node.repeater.keyPath;
      const keyValue = keyPath ? `getProp(item, ${JSON.stringify(keyPath)})` : undefined;
      const key = keyValue
        ? `(typeof ${keyValue} === 'string' && ${keyValue}.length > 0 ? ${keyValue} : index)`
        : 'index';
      const filter = node.repeater.filter;
      const queryState = filter ? stateIdentifiers.get(filter.queryState) : undefined;
      const rows = filter
        ? `${array}.map((item, index) => ({ item, index })).filter(({ item }) => { const query = (${queryState ?? 'undefined'} ?? '').trim().toLowerCase(); if (!query) return true; const value = getProp(item, ${JSON.stringify(filter.itemPath)}); return typeof value === 'string' && value.toLowerCase().includes(query); }).map(({ item, index }) => <Fragment key={${key}}>${templates}</Fragment>)`
        : `${array}.map((item, index) => <Fragment key={${key}}>${templates}</Fragment>)`;
      return `{${rows}}`;
    }
    return (node.children ?? [])
      .map((child) =>
        renderNode(
          child,
          tokenProperties,
          propPaths,
          booleanPropUuids,
          sourceNodes,
          cssRules,
          childRepeaterScopes(source, child, propPaths, repeaterScopes),
          behavior,
          stateIdentifiers,
        ),
      )
      .join('');
  }
  const declarations = Object.entries(node.dynamicStyle ?? {}).map(
    ([property, value]) => `  ${kebab(property)}: ${cssValue(value, tokenProperties)};`,
  );
  if (declarations.length) {
    const selector = node.nodeUuid ? `[data-facadeur-codegen-node="${node.nodeUuid}"]` : '.node';
    cssRules.push(`${selector} {\n${declarations.join('\n')}\n}`);
  }
  if (node.nodeUuid) {
    const resolvedClassStyles = new Map(Object.entries(node.dynamicClassStyles ?? {}));
    const classes = source?.classes ?? [];
    const orderedClasses = [
      ...classes.filter((item) => item.generated),
      ...classes.filter((item) => !item.generated),
    ];
    for (const item of orderedClasses) {
      const values = resolvedClassStyles.get(item.name) ?? item.style?.declarations ?? {};
      const entries = Object.entries(values).map(
        ([property, value]) => `  ${kebab(property)}: ${cssValue(value, tokenProperties)};`,
      );
      if (entries.length) {
        cssRules.push(
          `.facadeur-node-${node.nodeUuid}${classSelector(item.name)} {\n${entries.join('\n')}\n}`,
        );
      }
    }
  }
  const attributes: Record<string, unknown> = {
    ...node.attributes,
    ...Object.fromEntries(
      Object.entries(node.dataset ?? {}).map(([key, value]) => [`data-${key}`, value]),
    ),
    ...(node.properties ?? {}),
  };
  const nodeTransitions = (behavior?.transitions ?? []).filter(
    (transition) => transition.nodeUuid === node.nodeUuid,
  );
  if (
    nodeTransitions.some((transition) => transition.event === 'dragstart') &&
    repeaterScopes.size
  ) {
    attributes.draggable = true;
  }
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
  const classKey = Object.hasOwn(attributes, 'className') ? 'className' : 'class';
  const derivedClassExpression = source?.classes
    ? classExpression(
        source.classes,
        propPaths,
        booleanPropUuids,
        [...styleNodeUuids],
        repeaterScopes,
        new Map(
          Object.keys(behavior?.state ?? {}).map((name, index) => [name, `behaviorState${index}`]),
        ),
      )
    : undefined;
  const props = Object.entries(attributes)
    .map(([key, value]) => {
      if (key === classKey && derivedClassExpression) {
        return ` className={${derivedClassExpression}}`;
      }
      return ` ${reactAttribute(key)}=${jsxValue(reactValue(reactAttribute(key), value), source?.dom.attributes?.[key], propPaths, repeaterScopes, stateIdentifiers)}`;
    })
    .join('');
  const behaviorEvents = nodeTransitions.map((transition) => transition.event);
  const hasRepeaterDrop = nodeTransitions.some(
    (transition) =>
      transition.event === 'drop' &&
      transition.actions.some(
        (action) =>
          action.kind === 'move-array-item' &&
          (action.direction === 'before' || action.direction === 'after'),
      ),
  );
  const dragOverProp = hasRepeaterDrop ? ' onDragOver={(event) => event.preventDefault()}' : '';
  const eventProps = [...new Set(behaviorEvents)]
    .map((event) => {
      const name = `on${event[0]?.toUpperCase() ?? ''}${event.slice(1)}`;
      const handler = behaviorHandlerName(node.nodeUuid ?? '', event);
      const repeaterUuids = [
        ...new Set(
          (behavior?.transitions ?? [])
            .filter(
              (transition) => transition.nodeUuid === node.nodeUuid && transition.event === event,
            )
            .flatMap((transition) =>
              transition.actions.flatMap((action) =>
                action.kind === 'move-array-item' ? [action.repeaterUuid] : [],
              ),
            ),
        ),
      ];
      const indices = repeaterUuids
        .map((uuid) => {
          const scope = repeaterScopes.get(uuid);
          const index = scope?.indexExpression ?? (scope ? String(scope.index) : undefined);
          return index ? `${JSON.stringify(uuid)}: ${index}` : undefined;
        })
        .filter((entry): entry is string => Boolean(entry));
      const repeaterIndexEntries = [...repeaterScopes].map(([uuid, scope]) => {
        const index = scope.indexExpression ?? String(scope.index);
        return `${JSON.stringify(uuid)}: ${index}`;
      });
      const call = indices.length
        ? `${handler}(event, { ${indices.join(', ')} })`
        : `${handler}(event)`;
      if (event === 'dragstart' && repeaterIndexEntries.length) {
        return ` ${name}={(event) => { (event.nativeEvent as DragEvent).dataTransfer?.setData('application/x-facadeur-repeater', JSON.stringify({ ${repeaterIndexEntries.join(', ')} })); ${call}; }}`;
      }
      return ` ${name}={${call}}`;
    })
    .join('');
  const tag = safeTag(node.tagName);
  if (isVoidTag(tag)) return `<${tag}${props}${dragOverProp}${eventProps} />`;
  const content =
    node.text === undefined
      ? ''
      : jsxValue(node.text, source?.dom.text, propPaths, repeaterScopes, stateIdentifiers);
  const children = (node.children ?? [])
    .map((child) =>
      renderNode(
        child,
        tokenProperties,
        propPaths,
        booleanPropUuids,
        sourceNodes,
        cssRules,
        childRepeaterScopes(source, child, propPaths, repeaterScopes),
        behavior,
        stateIdentifiers,
      ),
    )
    .join('');
  return `<${tag}${props}${dragOverProp}${eventProps}>${content}${children}</${tag}>`;
}

function jsxValue(
  value: unknown,
  source: unknown,
  propPaths: ReadonlyMap<string, string>,
  repeaterScopes: ReadonlyMap<string, CodegenRepeaterScope>,
  stateIdentifiers: ReadonlyMap<string, string>,
) {
  if (typeof source === 'string') {
    const itemScope = [...repeaterScopes.values()].at(-1);
    if (source === '{item}' && itemScope) return `{${itemScope.itemExpression}}`;
    const itemFieldMatch = source.match(/^\{item:([^}]+)\}$/);
    if (itemFieldMatch?.[1] && itemScope) {
      return `{getProp(${itemScope.itemExpression}, ${JSON.stringify(itemFieldMatch[1])})}`;
    }
    const stateMatch = source.match(/^\{state:([^}]+)\}$/);
    if (stateMatch?.[1]) {
      const state = stateIdentifiers.get(stateMatch[1]);
      if (state) return `{${state}}`;
    }
    const match = source.match(/^\{props:([^}]+)\}$/);
    const scopedPath = match?.[1] ? itemScope?.itemPropPaths?.get(match[1]) : undefined;
    if (scopedPath && itemScope && match?.[1]) {
      const expression = `getProp(${itemScope.itemExpression}, ${JSON.stringify(scopedPath)})`;
      return `{${expression} ?? ${JSON.stringify(value)}}`;
    }
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
