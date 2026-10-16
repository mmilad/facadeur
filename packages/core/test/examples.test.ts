import { describe, expect, it } from 'vitest';
import { resolveDefinitionToElementBuildConfig, validateProjectCatalog } from '@facadeur/core';
import {
  createExampleCatalog,
  exampleCatalogDefinitions,
  facadeurSettings,
  facadeurWorkspace,
  facadeurWorkspaceMobile,
  facadeurComponents,
} from '@facadeur/examples';

describe('examples', () => {
  it('validates the canonical example catalog and its UUID keyed resources', () => {
    const catalog = validateProjectCatalog(createExampleCatalog());
    const definitions = exampleCatalogDefinitions();

    expect(Object.keys(catalog.atoms).length).toBeGreaterThan(0);
    expect(Object.keys(catalog.components).length).toBeGreaterThan(0);
    expect(Object.keys(catalog.pages).length).toBeGreaterThan(0);
    expect(definitions).toHaveLength(
      Object.keys(catalog.atoms).length +
        Object.keys(catalog.components).length +
        Object.keys(catalog.pages).length,
    );
    for (const family of ['color', 'space', 'radius', 'shadow', 'type', 'font'] as const) {
      for (const [uuid, token] of Object.entries(catalog.tokens?.[family] ?? {})) {
        expect(token.uuid).toBe(uuid);
      }
    }
    expect(catalog.globalStyles?.breakpoints?.length).toBeGreaterThan(0);
    expect(catalog.globalStyles?.breakpoints?.every((breakpoint) => Boolean(breakpoint.uuid))).toBe(
      true,
    );
  });

  it('includes the design-only Facadeur workspace and settings concepts without variants', () => {
    const catalog = validateProjectCatalog(createExampleCatalog());
    const findNode = (
      node: import('@facadeur/domain').Node,
      nodeUuid: string,
    ): import('@facadeur/domain').Node | undefined => {
      if (node.uuid === nodeUuid) return node;
      for (const child of node.dom.children ?? []) {
        const match = findNode(child, nodeUuid);
        if (match) return match;
      }
      return undefined;
    };
    const styleDeclarations = (nodeUuid: string) => {
      const definition = exampleCatalogDefinitions().find((item) => findNode(item.root, nodeUuid));
      const node = definition && findNode(definition.root, nodeUuid);
      return node?.classes?.find((item) => item.generated)?.style?.declarations;
    };
    const collectText = (node: ReturnType<typeof resolveDefinitionToElementBuildConfig>): string =>
      [node.text ?? '', ...(node.children ?? []).map(collectText)].join(' ');
    const workspaceText = collectText(
      resolveDefinitionToElementBuildConfig(facadeurWorkspace, catalog),
    );
    const settingsText = collectText(
      resolveDefinitionToElementBuildConfig(facadeurSettings, catalog),
    );
    const mobileWorkspaceText = collectText(
      resolveDefinitionToElementBuildConfig(facadeurWorkspaceMobile, catalog),
    );
    expect(catalog.pages[facadeurWorkspace.uuid]?.name).toBe('Facadeur workspace concept');
    expect(catalog.pages[facadeurSettings.uuid]?.name).toBe('Facadeur settings concept');
    expect(catalog.pages[facadeurWorkspaceMobile.uuid]?.name).toBe(
      'Facadeur workspace mobile concept',
    );
    expect(catalog.icons?.map((icon) => icon.id)).toEqual(
      expect.arrayContaining([
        'layers',
        'workspace',
        'components',
        'assets',
        'settings',
        'viewport',
        'typography',
        'schema',
        'colors',
        'spacing',
        'shadow',
        'radius',
        'global-styles',
        'menu',
        'saved',
        'save',
      ]),
    );
    expect(
      JSON.stringify([facadeurWorkspace, facadeurSettings, facadeurWorkspaceMobile]),
    ).not.toMatch(/variant/i);
    expect(JSON.stringify(facadeurComponents.sidebarRight)).toContain(
      'INHERITED  ·  FROM .form-control',
    );
    expect(JSON.stringify(facadeurComponents.sidebarRight)).toContain('GLOBAL  ·  SETTINGS');
    expect(JSON.stringify(facadeurComponents.globalStylesTable)).toContain('Global styles');
    expect(facadeurWorkspace.root.config?.definitionRef).toBe(facadeurComponents.shell.uuid);
    expect(styleDeclarations(facadeurComponents.shell.root.uuid)?.width).toBe('100%');
    expect(styleDeclarations(facadeurComponents.shell.root.uuid)?.height).toBeUndefined();
    expect(styleDeclarations(facadeurWorkspace.root.uuid)?.height).toBeUndefined();
    expect(styleDeclarations(facadeurSettings.root.uuid)?.height).toBeUndefined();
    expect(styleDeclarations(facadeurWorkspaceMobile.root.uuid)?.width).toBe('100%');
    expect(styleDeclarations(facadeurWorkspaceMobile.root.uuid)?.height).toBeUndefined();
    expect(JSON.stringify(facadeurWorkspaceMobile)).toContain('Layers drawer control');
    expect(JSON.stringify(facadeurWorkspaceMobile)).toContain('Inspector drawer control');
    expect(facadeurWorkspaceMobile.root.dom.children?.[0]?.config?.definitionRef).toBe(
      facadeurComponents.header.uuid,
    );
    expect(JSON.stringify(facadeurComponents)).not.toContain('Facadeur mobile header');
    expect(JSON.stringify(facadeurComponents.header)).toContain('Mobile header actions');
    expect(JSON.stringify(facadeurComponents.header)).toContain('Saved icon');
    expect(facadeurComponents.header.root.dom.children?.[0]?.name).toBe('Header left');
    expect(facadeurComponents.header.root.dom.children?.[1]?.name).toBe('Header right');
    expect(JSON.stringify(facadeurComponents.header)).toContain('Desktop project context');
    expect(JSON.stringify(facadeurComponents.header)).toContain('Desktop header actions');
    expect(JSON.stringify(facadeurComponents.header)).toContain('Save project');
    const [desktopHeaderActions, mobileHeaderActions] =
      facadeurComponents.header.root.dom.children?.[1]?.dom.children ?? [];
    for (const saveButton of [
      desktopHeaderActions?.dom.children?.[0],
      mobileHeaderActions?.dom.children?.[0],
    ]) {
      expect(saveButton?.dom.tagName).toBe('button');
      expect(saveButton?.dom.attributes?.['aria-label']).toBe('Save project');
    }
    expect(JSON.stringify(facadeurComponents.header)).not.toContain('Command search icon');
    expect(JSON.stringify(facadeurComponents.header)).not.toContain('Current project and asset');
    expect(JSON.stringify(facadeurComponents.header)).not.toContain('Saved status icon');
    expect(JSON.stringify(facadeurComponents.shell)).not.toContain('Layer context menu');
    expect(facadeurComponents.settingsCategory.schema.kind).toBe('inline');
    expect(facadeurComponents.settingsCategory.config?.previewData?.fields?.label).toBe(
      'Viewports',
    );
    expect(styleDeclarations(facadeurComponents.settingsCategory.root.uuid)?.color).toBe(
      '{props:660e8400-e29b-41d4-a716-000000001a2f}',
    );
    expect(styleDeclarations(facadeurComponents.settingsCategory.root.uuid)?.backgroundColor).toBe(
      '{props:660e8400-e29b-41d4-a716-000000001a30}',
    );
    expect(JSON.stringify(facadeurSettings)).toContain('"foreground":"#6754d9"');
    expect(JSON.stringify(facadeurSettings)).toContain('"background":"#f0edff"');
    expect(facadeurComponents.settingsCategory.config?.previewData?.fields?.icon).toMatch(
      /^data:image\/svg\+xml/,
    );
    expect(facadeurComponents.cssRule.schema.kind).toBe('inline');
    expect(facadeurComponents.cssRule.config?.previewData?.fields).toEqual({
      selector: '.form-control',
      property: 'color',
      value: '#25242a',
      source: 'Global',
    });
    expect(JSON.stringify(facadeurComponents.header)).not.toContain('{props:');
    expect(JSON.stringify(facadeurComponents.header)).not.toContain('Profile avatar');
    expect(workspaceText).toContain('Studio Kit');
    expect(workspaceText).toContain('Saved');
    expect(workspaceText).not.toContain('{props:');
    expect(workspaceText).toContain('INHERITED');
    expect(workspaceText).toContain('GLOBAL');
    expect(settingsText).toContain('Viewports');
    expect(settingsText).toContain('.form-control');
    expect(settingsText).toContain('.button-primary');
    expect(mobileWorkspaceText).toContain('facadeur');
  });
});
