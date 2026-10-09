import {
  canonicalizeTokenTree,
  DocumentError,
  structuralNodeFields,
  type DocumentFile,
  type FieldDefinition,
  type SchemaResolverContext,
} from '@facadeur/core';
import type { DesignInput } from '@facadeur/tokens';
import { assignCatalog, renderComponent, type ComponentFile } from './component';
import { renderDocumentCss, renderTokenCss } from './css';
import { localClassNames } from './component/class-names';
import { renderSharedContracts } from './component/shared-contracts';
import { assignDataContracts } from './component/data-contracts';
import { CodegenError } from './names';
import { generateStories } from './stories';
import type { GenerateReactOptions as PublicGenerateReactOptions } from '../../../src/types';

export interface GeneratedFile {
  path: string;
  contents: string;
}

export type GenerateReactOptions = PublicGenerateReactOptions;

export interface GenerateReactOutput {
  ui: GeneratedFile[];
  stories: GeneratedFile[];
}

/** Turn facadeur documents into React components, CSS, and Storybook stories. */
export function generateReact(options: GenerateReactOptions): GenerateReactOutput {
  const documents = [...options.documents].sort((left, right) =>
    left.id.localeCompare(right.id, 'en'),
  );
  const seen = new Set<string>();
  for (const document of documents) {
    if (seen.has(document.id)) {
      throw new CodegenError(`Duplicate document id "${document.id}"`);
    }
    seen.add(document.id);
  }
  const selected = selectDocuments(documents, options.entries);
  const contractContext: SchemaResolverContext = {
    documents: new Map(selected.map((document) => [document.id, document])),
    ...(options.schemaCatalog ? { schemaCatalog: options.schemaCatalog } : {}),
  };
  const contracts = new Map<string, Map<string, FieldDefinition>>();
  for (const document of selected) {
    try {
      contracts.set(document.id, structuralNodeFields(document, contractContext));
    } catch (error) {
      if (error instanceof DocumentError) throw new CodegenError(error.message);
      throw error;
    }
  }
  const catalog = assignCatalog(selected, contracts, options.schemaCatalog);
  const schemaFiles = assignDataContracts(catalog, options.schemaCatalog, contractContext);
  const classNames = new Map(selected.map((document) => [document.id, localClassNames(document)]));
  // Propagate actual context use through wrappers until the component graph is stable.
  let components: ComponentFile[];
  let changed: boolean;
  do {
    components = selected.map((document) =>
      renderComponent(document, catalog, { classNames: classNames.get(document.id)! }),
    );
    changed = false;
    for (const component of components) {
      const entry = catalog.get(component.id)!;
      if (component.usesContext && !entry.acceptsContext) {
        entry.acceptsContext = true;
        changed = true;
      }
    }
  } while (changed);
  const breakpoints = options.design?.breakpoints;
  const globalTokens =
    options.design?.tokens === undefined ? undefined : canonicalizeTokenTree(options.design.tokens);
  const ui: GeneratedFile[] = [
    { path: 'styles/tokens.css', contents: renderTokenCss(options.design) },
    ...components.flatMap((component, index) =>
      componentFiles(
        component,
        renderDocumentCss(
          selected[index]!,
          classNames.get(selected[index]!.id)!,
          breakpoints ? [...breakpoints] : undefined,
          selected,
          new Map([...catalog].map(([id, entry]) => [id, entry.component])),
          globalTokens,
        ),
      ),
    ),
    { path: 'css-modules.d.ts', contents: cssModulesDeclaration() },
    { path: 'contracts.ts', contents: renderSharedContracts() },
    ...schemaFiles,
    { path: 'index.ts', contents: renderIndex(components, schemaFiles.length > 0) },
  ];
  return { ui, stories: generateStories(selected, components, contracts) };
}

function selectDocuments(
  documents: readonly DocumentFile[],
  entries: readonly string[] | undefined,
): DocumentFile[] {
  if (!entries?.length) return [...documents];
  const byId = new Map(documents.map((document) => [document.id, document]));
  const selected = new Set<string>();
  const visit = (id: string): void => {
    if (selected.has(id)) return;
    const document = byId.get(id);
    if (!document) throw new CodegenError(`Unknown codegen entry or dependency "${id}"`);
    selected.add(id);
    visitInstances(document.root, visit);
  };
  entries.forEach(visit);
  return documents.filter((document) => selected.has(document.id));
}

function visitInstances(node: DocumentFile['root'], visit: (id: string) => void): void {
  if (node.type === 'instance') visit(node.component);
  if (node.type !== 'frame' && node.type !== 'repeater' && node.type !== 'switch') return;
  for (const child of node.children ?? []) visitInstances(child, visit);
}
export function designFromDocument(document: DocumentFile): DesignInput {
  return {
    ...(document.tokens ? { tokens: document.tokens } : {}),
    ...(document.settings?.breakpoints ? { breakpoints: document.settings.breakpoints } : {}),
  };
}

function componentFiles(component: ComponentFile, styleContents: string): GeneratedFile[] {
  const files: GeneratedFile[] = [
    {
      path: `${component.directory}/component.tsx`,
      contents: component.componentContents,
    },
    { path: `${component.directory}/types.ts`, contents: component.typesContents },
  ];
  files.push({ path: `${component.directory}/style.module.css`, contents: styleContents });
  files.push({ path: `${component.directory}/index.ts`, contents: component.indexContents });
  return files;
}

function cssModulesDeclaration(): string {
  return `declare module '*.module.css' {\n  const classes: Readonly<Record<string, string>>;\n  export default classes;\n}\n`;
}

function renderIndex(components: readonly ComponentFile[], hasSchemas: boolean): string {
  const lines = [
    '/**',
    ' * Generated by @facadeur/codegen-react.',
    ' * The facadeur JSON is the source of truth. Do not edit by hand.',
    ' */',
    '// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- load ambient CSS module types for consumers',
    '/// <reference path="./css-modules.d.ts" />',
    '',
    "export type { ComponentEvent, ComponentProps, DataContext, LabelProps, ValueProps, CommitProps } from './contracts';",
  ];
  if (hasSchemas) lines.push("export type * from './types';");
  for (const component of components) {
    lines.push(`export * from './${component.directory}';`);
  }
  lines.push('');
  return lines.join('\n');
}
