import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  toFlat,
  toNested,
  validateCatalog,
  validateDocumentFile,
  type DocumentFile,
} from '@facadeur/core';
import { createProjectTemplateDocument, loadTokens } from '@facadeur/tokens';
import templateFile from '../../../examples/project-template.json';

describe('document round-trip', () => {
  const file = createProjectTemplateDocument();

  it('validates and survives flat, nested, and Yjs without dropping tokens or fonts', () => {
    const validated = validateDocumentFile(file);
    expect(toNested(toFlat(validated))).toEqual(file);
    expect(validateCatalog([file])[0]).toEqual(file);
    expect(templateFile).toEqual(file);
    expect(loadTokens(toFlat(file)).properties.length).toBeGreaterThan(0);
  });

  it('edits tokens and fonts through commands', () => {
    let doc = toFlat(file);
    doc = applyCommand(doc, {
      type: 'setToken',
      path: 'color.blue.500',
      token: { $value: '#0000ff', $description: 'Changed' },
    });
    expect(doc.tokens).toMatchObject({
      color: { blue: { '500': { $value: '#0000ff', $description: 'Changed' } } },
    });
    doc = applyCommand(doc, {
      type: 'setFont',
      font: {
        id: 'mono',
        family: 'JetBrains Mono',
        weights: [400],
        source: { type: 'google', family: 'JetBrains Mono' },
        fallbacks: ['ui-monospace', 'monospace'],
      },
    });
    expect(doc.fonts.map((font) => font.id)).toEqual(['sans', 'mono']);
    doc = applyCommand(doc, {
      type: 'setBreakpoints',
      breakpoints: [
        { id: 'phone', minWidth: 390 },
        { id: 'desk', minWidth: 1280 },
      ],
    });
    expect(toNested(doc).settings?.breakpoints).toEqual([
      { id: 'phone', minWidth: 390 },
      { id: 'desk', minWidth: 1280 },
    ]);
    expect(toFlat(toNested(doc))).toEqual(doc);
  });

  it('round-trips a file font and a group $type through the nested file', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'theme',
      name: 'Theme',
      kind: 'atom',
      settings: {
        breakpoints: [
          { id: 'mobile', minWidth: 375 },
          { id: 'tablet', minWidth: 768 },
        ],
      },
      fonts: [
        {
          id: 'sans',
          family: 'Inter',
          weights: [400, 700],
          styles: ['normal', 'italic'],
          source: {
            type: 'file',
            files: [
              { weight: 400, style: 'normal', url: 'inter-400.woff2', format: 'woff2' },
              { weight: 400, style: 'italic', url: 'inter-400-italic.woff2', format: 'woff2' },
              { weight: 700, style: 'normal', url: 'inter-700.woff2', format: 'woff2' },
              { weight: 700, style: 'italic', url: 'inter-700-italic.woff2', format: 'woff2' },
            ],
          },
          fallbacks: ['sans-serif'],
        },
      ],
      tokens: {
        color: {
          $description: 'Palette',
          $type: 'color',
          ink: { $value: '#111111' },
        },
        type: {
          $type: 'typography',
          body: {
            $extensions: { facadeur: { breakpoints: { tablet: { fontSize: '18px' } } } },
            $value: {
              fontFamily: '{font.sans}',
              fontSize: '16px',
              fontWeight: 400,
              letterSpacing: '0',
              lineHeight: 1.5,
            },
          },
        },
      },
      root: { id: 'root', type: 'frame', tag: 'div' },
    };
    expect(toNested(toFlat(document))).toEqual(document);
    const next = applyCommand(toFlat(document), {
      type: 'removeToken',
      path: 'color.ink',
    });
    expect(next.tokens.color).toMatchObject({ $type: 'color', $description: 'Palette' });
    expect(next.tokens.color).not.toHaveProperty('ink');
    const removed = applyCommand(next, { type: 'removeFont', id: 'sans' });
    expect(removed.fonts).toEqual([]);
    expect(toNested(removed).fonts).toBeUndefined();
  });
});
