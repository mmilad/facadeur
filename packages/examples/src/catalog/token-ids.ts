const TOKEN_UUIDS: Readonly<Record<string, string>> = {
  'color.accent.default': '550e8400-e29b-41d4-a716-000000000401',
  'color.accent.hover': '550e8400-e29b-41d4-a716-000000000402',
  'color.bg.canvas': '550e8400-e29b-41d4-a716-000000000403',
  'color.bg.inverse': '550e8400-e29b-41d4-a716-000000000404',
  'color.bg.muted': '550e8400-e29b-41d4-a716-000000000405',
  'color.blue.500': '550e8400-e29b-41d4-a716-000000000406',
  'color.blue.600': '550e8400-e29b-41d4-a716-000000000407',
  'color.border.default': '550e8400-e29b-41d4-a716-000000000408',
  'color.danger.default': '550e8400-e29b-41d4-a716-000000000409',
  'color.green.600': '550e8400-e29b-41d4-a716-00000000040a',
  'color.neutral.0': '550e8400-e29b-41d4-a716-00000000040b',
  'color.neutral.50': '550e8400-e29b-41d4-a716-00000000040c',
  'color.neutral.100': '550e8400-e29b-41d4-a716-00000000040d',
  'color.neutral.200': '550e8400-e29b-41d4-a716-00000000040e',
  'color.neutral.400': '550e8400-e29b-41d4-a716-00000000040f',
  'color.neutral.600': '550e8400-e29b-41d4-a716-000000000410',
  'color.neutral.900': '550e8400-e29b-41d4-a716-000000000411',
  'color.red.500': '550e8400-e29b-41d4-a716-000000000412',
  'color.success.default': '550e8400-e29b-41d4-a716-000000000413',
  'color.text.inverse': '550e8400-e29b-41d4-a716-000000000414',
  'color.text.primary': '550e8400-e29b-41d4-a716-000000000415',
  'color.text.secondary': '550e8400-e29b-41d4-a716-000000000416',
  'radius.full': '550e8400-e29b-41d4-a716-000000000417',
  'radius.lg': '550e8400-e29b-41d4-a716-000000000418',
  'radius.md': '550e8400-e29b-41d4-a716-000000000419',
  'radius.none': '550e8400-e29b-41d4-a716-00000000041a',
  'radius.sm': '550e8400-e29b-41d4-a716-00000000041b',
  'radius.xl': '550e8400-e29b-41d4-a716-00000000041c',
  'shadow.lg': '550e8400-e29b-41d4-a716-00000000041d',
  'shadow.md': '550e8400-e29b-41d4-a716-00000000041e',
  'shadow.sm': '550e8400-e29b-41d4-a716-00000000041f',
  'space.0': '550e8400-e29b-41d4-a716-000000000420',
  'space.1': '550e8400-e29b-41d4-a716-000000000421',
  'space.2': '550e8400-e29b-41d4-a716-000000000422',
  'space.3': '550e8400-e29b-41d4-a716-000000000423',
  'space.4': '550e8400-e29b-41d4-a716-000000000424',
  'space.5': '550e8400-e29b-41d4-a716-000000000425',
  'space.6': '550e8400-e29b-41d4-a716-000000000426',
  'space.8': '550e8400-e29b-41d4-a716-000000000427',
  'space.10': '550e8400-e29b-41d4-a716-000000000428',
  'space.12': '550e8400-e29b-41d4-a716-000000000429',
  'space.16': '550e8400-e29b-41d4-a716-00000000042a',
  'space.20': '550e8400-e29b-41d4-a716-00000000042b',
  'space.24': '550e8400-e29b-41d4-a716-00000000042c',
  'space.gap.lg': '550e8400-e29b-41d4-a716-00000000042d',
  'space.gap.md': '550e8400-e29b-41d4-a716-00000000042e',
  'space.gap.sm': '550e8400-e29b-41d4-a716-00000000042f',
  'space.gap.xs': '550e8400-e29b-41d4-a716-000000000430',
  'space.inset.lg': '550e8400-e29b-41d4-a716-000000000431',
  'space.inset.md': '550e8400-e29b-41d4-a716-000000000432',
  'space.inset.sm': '550e8400-e29b-41d4-a716-000000000433',
  'space.inset.xs': '550e8400-e29b-41d4-a716-000000000434',
  'space.stack.lg': '550e8400-e29b-41d4-a716-000000000435',
  'space.stack.md': '550e8400-e29b-41d4-a716-000000000436',
  'space.stack.sm': '550e8400-e29b-41d4-a716-000000000437',
  'space.stack.xs': '550e8400-e29b-41d4-a716-000000000438',
  'type.body': '550e8400-e29b-41d4-a716-000000000439',
  'type.caption': '550e8400-e29b-41d4-a716-00000000043a',
  'type.display': '550e8400-e29b-41d4-a716-00000000043b',
  'type.heading': '550e8400-e29b-41d4-a716-00000000043c',
  'type.label': '550e8400-e29b-41d4-a716-00000000043d',
  'type.title': '550e8400-e29b-41d4-a716-00000000043e',
};

export function tokenUuidForPath(path: string) {
  return TOKEN_UUIDS[path];
}

export function addStableTokenUuids<T>(value: T): T {
  return addTokenUuids(value) as T;
}

function addTokenUuids(value: unknown, path = ''): unknown {
  if (Array.isArray(value)) return value.map((entry) => addTokenUuids(entry, path));
  if (!isRecord(value)) return value;

  if ('$value' in value) {
    const uuid = TOKEN_UUIDS[path];
    if (!uuid) throw new Error(`Example token "${path}" has no stable UUID`);
    const extensions = isRecord(value.$extensions) ? value.$extensions : {};
    const facadeur = isRecord(extensions.facadeur) ? extensions.facadeur : {};
    return {
      ...value,
      $extensions: { ...extensions, facadeur: { ...facadeur, uuid } },
    };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key.startsWith('$') ? child : addTokenUuids(child, path ? `${path}.${key}` : key),
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
