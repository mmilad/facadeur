// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createStyleEngine } from '@facadeur/style-engine';

function component(id: string): DocumentFile {
  return {
    version: 1,
    id,
    name: id,
    kind: 'component',
    root: { id: 'root', type: 'frame' },
    settings: {
      breakpoints: [
        { id: 'base', label: 'Base', minWidth: 0 },
        { id: 'wide', label: 'Wide', minWidth: 800 },
      ],
    },
    styles: {
      declarations: { color: 'red' },
      breakpoints: {
        wide: { declarations: { color: 'blue' } },
      },
    },
  };
}

describe('live stylesheet ownership', () => {
  it('replaces and removes document media rules without deleting borrowed or other document rules', () => {
    const element = document.createElement('style');
    document.head.append(element);
    element.sheet!.insertRule('.external { color: orange; }', 0);
    const external = element.sheet!.cssRules[0];
    const engine = createStyleEngine(element);
    try {
      const first = component('first');
      engine.setDocument(first);
      engine.setDocument(component('second'));
      engine.setDocument({ ...first, styles: { declarations: { color: 'green' } } });
      const current = [...engine.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n');
      expect(current).toContain('green');
      expect(current.match(/@media/g)).toHaveLength(1);

      engine.removeDocument('first');
      expect(engine.controller.sheet.cssRules[0]).toBe(external);
      const remaining = [...engine.controller.sheet.cssRules]
        .map((rule) => rule.cssText)
        .join('\n');
      expect(remaining).toContain('second');
      expect(remaining).not.toContain('first');

      engine.destroy();
      expect(element.isConnected).toBe(true);
      expect([...element.sheet!.cssRules]).toEqual([external]);
    } finally {
      engine.destroy();
      element.remove();
    }
  });
});
