import { isPlainObject, type TokenDefinition } from '@facadeur/core';

export function designTokenWithLabel(token: TokenDefinition, label: string): TokenDefinition {
  const trimmed = label.trim();
  if (!trimmed) return token;
  const extensions = isPlainObject(token.$extensions)
    ? { ...(token.$extensions as Record<string, unknown>) }
    : {};
  extensions.facadeur = { ...(isPlainObject(extensions.facadeur) ? extensions.facadeur : {}), label: trimmed };
  return { ...token, $extensions: extensions as TokenDefinition['$extensions'] };
}
