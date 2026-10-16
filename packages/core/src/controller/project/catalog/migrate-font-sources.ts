function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function migratedSystemFamily(sourceFamily: unknown, fallbacks: unknown): string {
  if (typeof sourceFamily !== 'string') return 'system-ui';
  const knownFamilies: Record<string, string> = {
    arial: 'Arial',
    georgia: 'Georgia',
    'times new roman': 'Times New Roman',
    'courier new': 'Courier New',
    verdana: 'Verdana',
    tahoma: 'Tahoma',
    'trebuchet ms': 'Trebuchet MS',
    'system-ui': 'system-ui',
    inter: 'system-ui',
    'source sans 3': 'system-ui',
    'playfair display': 'Georgia',
    'source serif 4': 'Georgia',
  };
  const knownFamily = knownFamilies[sourceFamily.toLowerCase()];
  if (knownFamily) return knownFamily;
  if (Array.isArray(fallbacks)) {
    const genericFamilies = new Set([
      'serif',
      'sans-serif',
      'monospace',
      'cursive',
      'fantasy',
      'system-ui',
      'ui-serif',
      'ui-sans-serif',
      'ui-monospace',
      'ui-rounded',
      'emoji',
      'math',
      'fangsong',
    ]);
    const localFallback = fallbacks.find(
      (fallback) =>
        typeof fallback === 'string' && fallback.trim() && !genericFamilies.has(fallback),
    );
    if (typeof localFallback === 'string') return localFallback;
    if (fallbacks[0] === 'serif' || fallbacks[fallbacks.length - 1] === 'serif') return 'Georgia';
  }
  return 'system-ui';
}

/** Convert persisted remote font sources to local system-font sources. */
export function migrateFontSources(catalog: unknown) {
  if (!isRecord(catalog) || !isRecord(catalog.tokens) || !isRecord(catalog.tokens.font)) {
    return catalog;
  }

  let changed = false;
  const fonts = Object.fromEntries(
    Object.entries(catalog.tokens.font).map(([uuid, token]) => {
      if (!isRecord(token) || !isRecord(token.value) || !isRecord(token.value.source)) {
        return [uuid, token];
      }
      if (token.value.source.type !== 'google') return [uuid, token];

      changed = true;
      return [
        uuid,
        {
          ...token,
          value: {
            ...token.value,
            family: migratedSystemFamily(token.value.source.family, token.value.fallbacks),
            source: { type: 'system' },
          },
        },
      ];
    }),
  );

  if (!changed) return catalog;
  return {
    ...catalog,
    tokens: {
      ...catalog.tokens,
      font: fonts,
    },
  };
}
