import type { DocumentFile } from '@facadeur/core';
import { loadTokens } from '@facadeur/tokens';

/** Preserve token references/cycle/breakpoint checks independently of the storage adapter. */
export function validateProjectDesign(
  document: Pick<DocumentFile, 'tokens' | 'fonts' | 'settings'>,
) {
  loadTokens({
    tokens: document.tokens,
    fonts: document.fonts,
    breakpoints: document.settings?.breakpoints,
  });
}
