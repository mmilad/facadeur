import { DocumentError } from '../document/errors.js';
import type { FlatDocument } from '../document/flat.js';
import type { Breakpoint, FontFamily } from '../document/schema.js';
import { assertBreakpoints, assertFont, cloneBreakpoints, cloneFont } from '../styles/libraries.js';

export function setFont(doc: FlatDocument, font: FontFamily): void {
  assertFont(font);
  const next = cloneFont(font);
  const index = doc.fonts.findIndex((item) => item.id === next.id);
  if (index === -1) doc.fonts.push(next);
  else doc.fonts[index] = next;
}

export function removeFont(doc: FlatDocument, id: string): void {
  const index = doc.fonts.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new DocumentError('schema', `Font "${id}" is not defined`);
  }
  doc.fonts.splice(index, 1);
}

export function setBreakpoints(doc: FlatDocument, breakpoints: Breakpoint[]): void {
  if (!breakpoints.length) {
    delete doc.settings.breakpoints;
    return;
  }
  assertBreakpoints(breakpoints);
  doc.settings.breakpoints = cloneBreakpoints(breakpoints);
}
