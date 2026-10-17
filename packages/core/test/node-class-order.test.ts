import { describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import type { ElementBuildConfig, RenderBuildConfig } from '@facadeur/domain';
import { resolveDefinitionToElementBuildConfig } from '../src/controller/project/node/preview/resolve';

describe('node class order', () => {
  it('resolves generated root class styles before authored class styles', () => {
    const catalog = createExampleCatalog();
    const definition = catalog.components[exampleIds.components.card.definition]!;
    const generated = definition.root.classes?.find((item) => item.generated)!;
    const orderedDefinition = {
      ...definition,
      root: {
        ...definition.root,
        classes: [
          { name: 'is-open', style: { declarations: { display: 'block' } } },
          { ...generated, style: { declarations: { display: 'none' } } },
        ],
      },
    };

    const resolved = resolveDefinitionToElementBuildConfig(orderedDefinition, catalog);
    const styleConfig = firstElement(resolved);

    expect(Object.keys(styleConfig?.dynamicClassStyles ?? {})).toEqual([generated.name, 'is-open']);
  });
});

function firstElement(node: RenderBuildConfig): ElementBuildConfig | undefined {
  if ('dynamicClassStyles' in node) return node;
  for (const child of node.children ?? []) {
    const element = firstElement(child);
    if (element) return element;
  }
  return undefined;
}
