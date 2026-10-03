import {
  componentTokensByPath,
  defaultBreakpoints,
  resolveVariantDocument,
  variantPresets,
  type Breakpoint,
  type DocumentFile,
} from '@facadeur/core';
import type { CompileOptions, CompiledRule } from './types';
import type { SubstituteContext } from '../css/types';
import { expandDeclarations } from '../css/values';
import { nestedStyleTargetSelector, resolveNestedStyleTarget } from '../selectors/nested-target';
import { withVariant } from '../selectors/variants';
import { compileAuthoredRules } from './authored-rules';
import { appendCompiledRule, emitSparseStyleLayers } from './rules';
import { walk } from './nodes';
/** Turn one document into stylesheet rules. Token refs stay as `var(--…)`. */
export function compileDocument(
  document: DocumentFile,
  options: CompileOptions = {},
): CompiledRule[] {
  const base = compileSingleDocument(document, options);
  if (options.address === 'canvas') return base;
  const named = variantPresets(document).filter((variant) => variant.name !== 'default');
  const variants = named.flatMap((variant) =>
    compileSingleDocument(resolveVariantDocument(document, variant.name), {
      ...options,
      variantScope: variant.name,
    }),
  );
  return [...base, ...variants];
}

function compileSingleDocument(
  document: DocumentFile,
  options: CompileOptions & { variantScope?: string } = {},
): CompiledRule[] {
  const address = options.address ?? 'instance';
  const breakpoints = resolveBreakpoints(document, options.breakpoints);
  const rules: CompiledRule[] = [];
  const rootRendered =
    options.paintRoot === true || !(address === 'canvas' && document.root.type === 'frame');
  const substituteContext: SubstituteContext = {
    documentId: document.id,
    ...(document.componentTokens
      ? { componentTokens: componentTokensByPath(document.componentTokens) }
      : {}),
  };
  walk(document, document.root, {
    address,
    breakpoints,
    parentDirection: undefined,
    path: rootRendered ? document.root.id : null,
    isRoot: true,
    rendered: rootRendered,
    variantScope: options.variantScope,
    substituteContext,
    rules,
    selectorForNode: options.selectorForNode,
  });
  {
    for (const [targetPath, layer] of Object.entries(document.styles?.children ?? {})) {
      if (!targetPath.includes('/')) continue;
      const target = resolveNestedStyleTarget(document, targetPath, options.catalog ?? [document]);
      if (!target) continue;
      const selector = nestedStyleTargetSelector(
        document,
        targetPath,
        target,
        address,
        rootRendered,
      );
      const selected =
        options.selectorForNode?.({
          documentId: document.id,
          node: document.root,
          nodeId: document.root.id,
          path: null,
          isRoot: true,
          address,
          defaultSelector: selector,
          targetPath,
          variantScope: options.variantScope,
        }) ?? selector;
      const scoped = options.variantScope
        ? withVariant(selected, 'variant', options.variantScope)
        : selected;
      appendCompiledRule(
        { rules },
        `${document.id}:${targetPath}:base`,
        scoped,
        expandDeclarations(layer.declarations, substituteContext),
      );
      emitSparseStyleLayers(document.id, targetPath, layer, scoped, {
        breakpoints,
        substituteContext,
        rules,
      });
    }
  }
  compileAuthoredRules(
    document,
    {
      address,
      selectorForStyleRule: options.selectorForStyleRule,
      ...(options.variantScope ? { variantScope: options.variantScope } : {}),
    },
    {
      substituteContext,
      rules,
      breakpoints,
    },
  );
  // Wider responsive layers win; stable sorting retains precedence within each width.
  return rules.sort((left, right) => (left.minWidth ?? -Infinity) - (right.minWidth ?? -Infinity));
}

function resolveBreakpoints(
  document: DocumentFile,
  fallback: readonly Breakpoint[] | undefined,
): Breakpoint[] {
  const list = document.settings?.breakpoints?.length
    ? document.settings.breakpoints
    : fallback?.length
      ? fallback
      : defaultBreakpoints;
  return [...list].sort((left, right) => left.minWidth - right.minWidth);
}
