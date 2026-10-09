import { describe, expect, it } from 'vitest';
import type { FlatDocument } from '@facadeur/core';
import {
  displayMode,
  effectiveLayout,
  layoutCapabilities,
} from '../src/domain/layout-capabilities';
import { exampleIds as fixtureIds } from '@facadeur/examples';

function documentFixture(): FlatDocument {
  return {
    version: 1,
    id: 'layout-capabilities',
    name: 'Layout capabilities',
    kind: 'component',
    rootId: 'root',
    fields: [],
    variants: [],
    settings: {},
    tokens: {},
    fonts: [],
    nodes: {
      root: { id: 'root', type: 'frame', children: ['row', 'flow', 'flexText'] },
      row: {
        id: 'row',
        type: 'frame',
        children: ['item', 'absolute'],
        layout: { direction: 'row', breakpoints: { [fixtureIds.catalog.breakpoints.tablet]: { direction: 'column' } } },
      },
      item: { id: 'item', type: 'text', layout: { width: { mode: 'fill' } } },
      absolute: {
        id: 'absolute',
        type: 'text',
        layout: { position: 'absolute', x: 10, y: 12 },
      },
      flow: {
        id: 'flow',
        type: 'frame',
        children: [],
        layout: { direction: 'row' },
      },
      flexText: { id: 'flexText', type: 'text' },
    },
  };
}

describe('layout capabilities', () => {
  it('resolves effective layout layers at the active breakpoint', () => {
    expect(
      effectiveLayout(documentFixture().nodes.row?.layout, fixtureIds.catalog.breakpoints.tablet, [
        { id: 'base', minWidth: 0 },
        { uuid: fixtureIds.catalog.breakpoints.tablet, label: 'Tablet', minWidth: 768 },
      ]).direction,
    ).toBe('column');
  });

  it('keeps absolute children out of their parent flex or grid item context', () => {
    const caps = layoutCapabilities({
      document: documentFixture(),
      nodeId: 'absolute',
      breakpoints: [{ id: 'base', minWidth: 0 }],
    });
    expect(caps.parentDisplay).toBe('flex');
    expect(caps.isDirectFlexItem).toBe(false);
    expect(caps.isDirectGridItem).toBe(false);
    expect(caps.availableFields).toContain('x');
  });

  it('lets an effective CSS position override the DSL position', () => {
    const caps = layoutCapabilities({
      document: documentFixture(),
      nodeId: 'absolute',
      styleDeclarations: { absolute: { position: 'static' } },
    });
    expect(caps.isAbsolute).toBe(false);
    expect(caps.isDirectFlexItem).toBe(true);
    expect(caps.availableFields).not.toContain('x');
  });

  it('uses the effective display declaration when classifying a parent', () => {
    const doc = documentFixture();
    const caps = layoutCapabilities({
      document: doc,
      nodeId: 'item',
      breakpointId: fixtureIds.catalog.breakpoints.tablet,
      variantName: 'compact',
      breakpoints: [
        { id: 'base', minWidth: 0 },
        { uuid: fixtureIds.catalog.breakpoints.tablet, label: 'Tablet', minWidth: 768 },
      ],
      styleDeclarations: {
        row: { display: 'grid' },
      },
    });
    expect(caps.parentDisplay).toBe('grid');
    expect(caps.isDirectGridItem).toBe(true);
    expect(caps.isDirectFlexItem).toBe(false);
    expect(caps.variantName).toBe('compact');
    expect(caps.property('grid-column').supported).toBe(true);
    expect(caps.property('flex-grow').supported).toBe(false);
    expect(caps.property('order').supported).toBe(true);
    const container = layoutCapabilities({
      document: doc,
      nodeId: 'row',
      styleDeclarations: { row: { display: 'grid' } },
    });
    expect(container.property('align-items').supported).toBe(true);
    expect(container.property('grid-template-areas').supported).toBe(true);
  });

  it('retains existing container values as inactive when display is flow', () => {
    const doc = documentFixture();
    expect(displayMode(doc.nodes.flow!, undefined)).toBe('flex');
    const caps = layoutCapabilities({
      document: doc,
      nodeId: 'flow',
      styleDeclarations: { flow: { display: 'block' } },
    });
    expect(caps.selectedDisplay).toBe('flow');
    expect(caps.availableFields).not.toContain('direction');
    expect(caps.property('flex-direction').supported).toBe(false);
  });

  it('recognizes a generic flex display on a non-frame node as a container', () => {
    const caps = layoutCapabilities({
      document: documentFixture(),
      nodeId: 'flexText',
      styleDeclarations: { flexText: { display: 'flex' } },
    });
    expect(caps.selectedRole).toBe('container');
    expect(caps.property('flex-direction').supported).toBe(true);
  });

  it('uses the resolved master root when styling an instance', () => {
    const doc = documentFixture();
    doc.nodes.flexText = { id: 'flexText', type: 'instance', component: 'master' };
    const caps = layoutCapabilities({
      document: doc,
      nodeId: 'flexText',
      instanceRoot: { id: 'master-root', type: 'frame', children: [] },
      styleDeclarations: { flexText: { display: 'flex' } },
    });
    expect(caps.selectedDisplay).toBe('flex');
    expect(caps.property('flex-direction').supported).toBe(true);
  });
});
