import type { DocumentFile } from '@facadeur/core';
import { loadTokens } from '@facadeur/tokens';

/** Preserve token references/cycle/breakpoint checks independently of the storage adapter. */
export function validateProjectDesign(
  document: Pick<DocumentFile, 'tokens' | 'settings'>,
) {
  loadTokens({
    tokens: document.tokens,
    breakpoints: document.settings?.breakpoints,
  });
}
