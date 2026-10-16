import {
  appendStyleSelectorSuffix,
  readTokenTree,
  replaceSelectorClasses,
  tokenCustomProperty,
  typographyCustomProperty,
} from '@facadeur/core';
import type {
  RenderBuildConfig,
  LayerMap,
  Node,
  ProjectCatalog,
  StyleLayer,
  VariantStyleMap,
} from '@facadeur/domain';

const TYPOGRAPHY_FIELDS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
] as const;
const SINGLE_TOKEN = /^\{token:([^}]+)\}$/;
const COMPONENT_PROP_REFERENCE = /^\{props:[^}]+\}$/;

/** Compile project-level Catalog styles into CSS for generated components. */
export function renderGlobalStyleCss(catalog: ProjectCatalog): string {
  const block = catalog.globalStyles?.block;
  const tokenSets = catalog.globalStyles?.tokenInterface?.sets ?? {};
  const tokens = new Map(
    [...readTokenTree(catalog.tokens ?? {}).tokens].map(([uuid, token]) => [uuid, token]),
  );
  const { nodeUuids, rootUuidByNode, nodes } = indexCatalogNodes(catalog);
  if (
    !block &&
    !Object.keys(tokenSets).length &&
    ![...nodes.values()].some((node) => node.classes?.some((item) => item.style))
  ) {
    return '';
  }
  const rules: string[] = [];
  if (block) emitLayer(rules, ':root', block, block.breakpoints, catalog, tokens);

  for (const authored of block?.rules ?? []) {
    const rootUuids = new Set<string>();
    let referencesRoot = false;
    const selector = replaceSelectorClasses(authored.selector, (className) => {
      const uuid = authored.bindings?.[className];
      if (!uuid || !nodeUuids.has(uuid)) {
        throw new Error(
          `Global style rule "${authored.id}" has an unresolved binding ".${className}"`,
        );
      }
      const rootUuid = rootUuidByNode.get(uuid);
      if (rootUuid) {
        rootUuids.add(rootUuid);
        if (rootUuid === uuid) referencesRoot = true;
      }
      return codegenNodeClass(uuid);
    });
    const scopedSelector =
      rootUuids.size === 1 && !referencesRoot
        ? `.${codegenNodeClass([...rootUuids][0]!)} ${selector}`
        : selector;
    emitLayer(rules, scopedSelector, authored, authored.breakpoints, catalog, tokens);
  }

  for (const node of nodes.values()) {
    const rootUuid = rootUuidByNode.get(node.uuid);
    for (const item of node.classes ?? []) {
      if (!item.style) continue;
      const nodeSelector = `.${codegenNodeClass(node.uuid)}${classSelector(item.name)}`;
      const selector =
        rootUuid && rootUuid !== node.uuid
          ? `.${codegenNodeClass(rootUuid)} ${nodeSelector}`
          : nodeSelector;
      emitLayer(rules, selector, item.style, item.style.breakpoints, catalog, tokens);
    }
  }

  for (const [uuid, value] of Object.entries(tokenSets)) {
    const token = tokens.get(uuid);
    const property = tokenCustomProperty(token?.path ?? uuid);
    rules.push(cssRule(':root', [[property, substitute(value, tokens, catalog)]]));
  }

  return rules.join('\n\n');
}

/** Render resolved per-instance property bindings used by Catalog style rules. */
export function renderDynamicStyleCss(root: RenderBuildConfig, catalog: ProjectCatalog): string {
  const tokens = new Map(
    [...readTokenTree(catalog.tokens ?? {}).tokens].map(([uuid, token]) => [uuid, token]),
  );
  const rules: string[] = [];
  const visit = (node: RenderBuildConfig, scopes: readonly string[]) => {
    if (node.kind === 'fragment') {
      for (const child of node.children ?? []) visit(child, scopes);
      return;
    }
    const styleUuids = node.styleNodeUuids?.length
      ? [...new Set(node.styleNodeUuids)]
      : node.nodeUuid
        ? [node.nodeUuid]
        : [];
    const instanceRoot = node.nodeUuid && styleUuids.length > 1 ? node.nodeUuid : undefined;
    const selectorUuids = [...new Set([...scopes, ...(instanceRoot ? [instanceRoot] : [])])];
    if (node.nodeUuid && node.dynamicStyle && Object.keys(node.dynamicStyle).length) {
      const selector = [
        ...selectorUuids.map((uuid) => `.${codegenNodeClass(uuid)}`),
        ...(selectorUuids.includes(node.nodeUuid) ? [] : [`.${codegenNodeClass(node.nodeUuid)}`]),
      ].join(' ');
      rules.push(cssRule(selector, declarations(node.dynamicStyle, tokens, catalog)));
    }
    if (node.nodeUuid) {
      for (const [className, values] of Object.entries(node.dynamicClassStyles ?? {})) {
        const selector = [
          ...selectorUuids
            .filter((uuid) => uuid !== node.nodeUuid)
            .map((uuid) => `.${codegenNodeClass(uuid)}`),
          `.${codegenNodeClass(node.nodeUuid)}${classSelector(className)}`,
        ].join(' ');
        rules.push(cssRule(selector, declarations(values, tokens, catalog)));
      }
    }
    const childScopes = instanceRoot ? [...scopes, instanceRoot] : scopes;
    for (const child of node.children ?? []) visit(child, childScopes);
  };
  visit(root, []);
  return rules.join('\n\n');
}

function emitLayer(
  output: string[],
  selector: string,
  layer: StyleLayer & { variants?: VariantStyleMap },
  breakpoints: LayerMap | undefined,
  catalog: ProjectCatalog,
  tokens: ReadonlyMap<string, IndexedToken>,
) {
  if (layer.declarations)
    output.push(cssRule(selector, declarations(layer.declarations, tokens, catalog)));
  for (const [state, values] of Object.entries(layer.states ?? {})) {
    output.push(
      cssRule(
        appendStyleSelectorSuffix(selector, `:${state}`),
        declarations(values, tokens, catalog),
      ),
    );
  }
  for (const [axis, variants] of Object.entries(layer.variants ?? {})) {
    for (const [value, variant] of Object.entries(variants)) {
      const selected = withVariant(selector, axis, value);
      if (variant.declarations)
        output.push(cssRule(selected, declarations(variant.declarations, tokens, catalog)));
      for (const [state, values] of Object.entries(variant.states ?? {})) {
        output.push(
          cssRule(
            appendStyleSelectorSuffix(selected, `:${state}`),
            declarations(values, tokens, catalog),
          ),
        );
      }
    }
  }
  const baseline = catalog.globalStyles?.breakpoints?.[0]?.uuid;
  for (const [uuid, override] of Object.entries(breakpoints ?? {})) {
    if (uuid === baseline) continue;
    const breakpoint = catalog.globalStyles?.breakpoints?.find((item) => item.uuid === uuid);
    if (!breakpoint || breakpoint.enabled === false) continue;
    const media = (content: string) =>
      `@media (min-width: ${breakpoint.minWidth}px) {\n${indent(content)}\n}`;
    if (override.declarations)
      output.push(
        media(cssRule(selector, declarations(override.declarations, tokens, catalog), 1)),
      );
    for (const [state, values] of Object.entries(override.states ?? {})) {
      output.push(
        media(
          cssRule(
            appendStyleSelectorSuffix(selector, `:${state}`),
            declarations(values, tokens, catalog),
            1,
          ),
        ),
      );
    }
  }
}

/** One Catalog walk supplies authored-rule binding validation and component scope roots. */
function indexCatalogNodes(catalog: ProjectCatalog) {
  const nodeUuids = new Set<string>();
  const rootUuidByNode = new Map<string, string>();
  const nodes = new Map<string, Node>();
  const visit = (node: Node, rootUuid: string) => {
    nodeUuids.add(node.uuid);
    nodes.set(node.uuid, node);
    rootUuidByNode.set(node.uuid, rootUuid);
    for (const child of node.dom.children ?? []) visit(child, rootUuid);
  };
  for (const definitions of [catalog.atoms, catalog.components, catalog.pages]) {
    for (const definition of Object.values(definitions))
      visit(definition.root, definition.root.uuid);
  }
  return { nodeUuids, rootUuidByNode, nodes };
}

function classSelector(name: string) {
  return `.${name.replace(/[^A-Za-z0-9_-]/g, (character) => `\\${character.codePointAt(0)!.toString(16)} `)}`;
}

function codegenNodeClass(uuid: string) {
  return `facadeur-node-${uuid}`;
}

function declarations(
  values: Readonly<Record<string, string>>,
  tokens: ReadonlyMap<string, IndexedToken>,
  catalog: ProjectCatalog,
): [string, string][] {
  const output: [string, string][] = [];
  for (const [property, value] of Object.entries(values)) {
    if (COMPONENT_PROP_REFERENCE.test(value)) continue;
    const uuid = value.match(SINGLE_TOKEN)?.[1];
    const token = uuid ? tokens.get(uuid) : undefined;
    if (
      property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`) === 'font' &&
      token?.valueType === 'typography'
    ) {
      for (const field of TYPOGRAPHY_FIELDS) {
        output.push([kebab(field), `var(${typographyCustomProperty(token.path, field)})`]);
      }
    } else {
      output.push([kebab(property), substitute(value, tokens, catalog)]);
    }
  }
  return output;
}

function substitute(
  value: string,
  tokens: ReadonlyMap<string, IndexedToken>,
  catalog: ProjectCatalog,
) {
  const withProps = value.replace(
    /\{prop:([^}]+)\}/g,
    (_match, uuid: string) => catalog.props?.[uuid]?.value ?? '',
  );
  return withProps.replace(/\{token:([^}]+)\}/g, (_match, uuid: string) => {
    const token = tokens.get(uuid);
    return `var(${token ? tokenCustomProperty(token.path) : `--token-${uuid}`})`;
  });
}

type IndexedToken =
  ReturnType<typeof readTokenTree>['tokens'] extends ReadonlyMap<string, infer Token>
    ? Token
    : never;

function cssRule(selector: string, values: readonly [string, string][], level = 0) {
  if (!values.length) return '';
  const pad = '  '.repeat(level);
  return `${pad}${selector} {\n${values.map(([name, value]) => `${pad}  ${name}: ${value};`).join('\n')}\n${pad}}`;
}

function withVariant(selector: string, axis: string, value: string) {
  const attribute = `[data-variant-${cssAttribute(axis)}="${cssAttribute(value)}"]`;
  return appendStyleSelectorSuffix(selector, attribute);
}

function cssAttribute(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function indent(value: string) {
  return value
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function kebab(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
