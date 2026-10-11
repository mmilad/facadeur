import {
  appendStyleSelectorSuffix,
  readTokenTree,
  replaceSelectorClasses,
  tokenCustomProperty,
  typographyCustomProperty,
} from '@facadeur/core';
import type { LayerMap, Node, ProjectCatalog, StyleLayer, VariantStyleMap } from '@facadeur/domain';

const TYPOGRAPHY_FIELDS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
] as const;
const SINGLE_TOKEN = /^\{token:([^}]+)\}$/;

/** Compile project-level Catalog styles into CSS for generated components. */
export function renderGlobalStyleCss(catalog: ProjectCatalog): string {
  const block = catalog.globalStyles?.block;
  const tokenSets = catalog.globalStyles?.tokenInterface?.sets ?? {};
  if (!block && !Object.keys(tokenSets).length) return '';

  const tokens = new Map(
    [...readTokenTree(catalog.tokens ?? {}).tokens].map(([uuid, token]) => [uuid, token]),
  );
  const selectorsByNode = nodeSelectors(catalog);
  const nodeUuids = catalogNodeUuids(catalog);
  const rules: string[] = [];
  if (block) emitLayer(rules, ':root', block, block.breakpoints, catalog, tokens);

  for (const [path, layer] of Object.entries(block?.children ?? {})) {
    const selectors = selectorsByNode.get(path);
    if (!selectors?.length) {
      throw new Error(`Global style child path "${path}" does not resolve to Catalog nodes`);
    }
    for (const selector of selectors) {
      emitLayer(rules, selector, layer, layer.breakpoints, catalog, tokens);
    }
  }

  for (const authored of block?.rules ?? []) {
    const selector = replaceSelectorClasses(authored.selector, (className) => {
      const uuid = authored.bindings?.[className];
      if (!uuid || !nodeUuids.has(uuid)) {
        throw new Error(
          `Global style rule "${authored.id}" has an unresolved binding ".${className}"`,
        );
      }
      return codegenNodeClass(uuid);
    });
    emitLayer(rules, selector, authored, authored.breakpoints, catalog, tokens);
  }

  for (const [uuid, value] of Object.entries(tokenSets)) {
    const token = tokens.get(uuid);
    const property = tokenCustomProperty(token?.path ?? uuid);
    rules.push(cssRule(':root', [[property, substitute(value, tokens)]]));
  }

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
  if (layer.declarations) output.push(cssRule(selector, declarations(layer.declarations, tokens)));
  for (const [state, values] of Object.entries(layer.states ?? {})) {
    output.push(
      cssRule(appendStyleSelectorSuffix(selector, `:${state}`), declarations(values, tokens)),
    );
  }
  for (const [axis, variants] of Object.entries(layer.variants ?? {})) {
    for (const [value, variant] of Object.entries(variants)) {
      const selected = withVariant(selector, axis, value);
      if (variant.declarations)
        output.push(cssRule(selected, declarations(variant.declarations, tokens)));
      for (const [state, values] of Object.entries(variant.states ?? {})) {
        output.push(
          cssRule(appendStyleSelectorSuffix(selected, `:${state}`), declarations(values, tokens)),
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
      output.push(media(cssRule(selector, declarations(override.declarations, tokens), 1)));
    for (const [state, values] of Object.entries(override.states ?? {})) {
      output.push(
        media(
          cssRule(
            appendStyleSelectorSuffix(selector, `:${state}`),
            declarations(values, tokens),
            1,
          ),
        ),
      );
    }
  }
}

function nodeSelectors(catalog: ProjectCatalog) {
  const selectors = new Map<string, string[]>();
  const visit = (node: Node, rootUuid: string, path: readonly string[]) => {
    for (const child of node.dom.children ?? []) {
      const childPath = [...path, child.uuid];
      const key = childPath.join('/');
      selectors.set(key, [...(selectors.get(key) ?? []), pathSelector(rootUuid, childPath)]);
      visit(child, rootUuid, childPath);
    }
  };
  for (const definitions of [catalog.atoms, catalog.components, catalog.pages]) {
    for (const definition of Object.values(definitions))
      visit(definition.root, definition.root.uuid, []);
  }
  return selectors;
}

function catalogNodeUuids(catalog: ProjectCatalog) {
  const uuids = new Set<string>();
  const visit = (node: Node) => {
    uuids.add(node.uuid);
    for (const child of node.dom.children ?? []) visit(child);
  };
  for (const definitions of [catalog.atoms, catalog.components, catalog.pages]) {
    for (const definition of Object.values(definitions)) visit(definition.root);
  }
  return uuids;
}

function pathSelector(rootUuid: string, path: readonly string[]) {
  return [rootUuid, ...path].map(nodeSelector).join(' > ');
}

function nodeSelector(uuid: string) {
  return `[data-facadeur-codegen-node="${uuid}"]`;
}

function codegenNodeClass(uuid: string) {
  return `facadeur-node-${uuid}`;
}

function declarations(
  values: Readonly<Record<string, string>>,
  tokens: ReadonlyMap<string, IndexedToken>,
): [string, string][] {
  const output: [string, string][] = [];
  for (const [property, value] of Object.entries(values)) {
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
      output.push([kebab(property), substitute(value, tokens)]);
    }
  }
  return output;
}

function substitute(value: string, tokens: ReadonlyMap<string, IndexedToken>) {
  return value.replace(/\{token:([^}]+)\}/g, (_match, uuid: string) => {
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
