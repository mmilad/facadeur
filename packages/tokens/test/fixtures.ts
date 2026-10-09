import { createExampleCatalog } from '@facadeur/examples';
import type {
  Breakpoint,
  DesignTokenRecord,
  DesignTokenSet,
  DesignTokenUuid,
  FontFamilyDefinition,
} from '@facadeur/core';

const exampleCatalog = createExampleCatalog();
export const exampleTokens = exampleCatalog.tokens!;
export const testBreakpoints = exampleCatalog.globalStyles!.breakpoints!;

function findRecord<T extends DesignTokenRecord>(
  records: Readonly<Record<string, T>>,
  label: string,
  group = '',
): T {
  const result = Object.values(records).find(
    (record) => record.label === label && record.group === group,
  );
  if (!result) throw new Error(`Missing example token ${group ? `${group}.` : ''}${label}`);
  return result;
}

function findBreakpoint(label: string): Breakpoint {
  const result = testBreakpoints.find((breakpoint) => breakpoint.label === label);
  if (!result) throw new Error(`Missing example breakpoint ${label}`);
  return result;
}

const blue500 = findRecord(exampleTokens.color, '500', 'blue');
const blue600 = findRecord(exampleTokens.color, '600', 'blue');
const accent = findRecord(exampleTokens.color, 'Default', 'accent');
const space4 = findRecord(exampleTokens.space, '4');
const shadow = findRecord(exampleTokens.shadow, 'Lg');
const body = findRecord(exampleTokens.type, 'Body');
const font = Object.values(exampleTokens.font).find((record) => record.label === 'Inter');
if (!font) throw new Error('Missing example token Inter');
const cycleA = globalThis.crypto.randomUUID();
const cycleB = globalThis.crypto.randomUUID();
const missing = globalThis.crypto.randomUUID();

export const tokenIds = {
  blue500: blue500.uuid,
  blue600: blue600.uuid,
  accent: accent.uuid,
  space4: space4.uuid,
  shadow: shadow.uuid,
  typography: body.uuid,
  font: font.uuid,
  cycleA,
  cycleB,
  missing,
} as const satisfies Record<string, DesignTokenUuid>;

export const breakpointIds = {
  phone: findBreakpoint('Phone').uuid,
  tablet: findBreakpoint('Tablet').uuid,
  laptop: findBreakpoint('Laptop').uuid,
  wide: findBreakpoint('Wide').uuid,
} as const;

export function record(
  uuid: DesignTokenUuid,
  label: string,
  group: string,
  valueType: DesignTokenRecord['valueType'],
  value: DesignTokenRecord['value'],
  extras: Partial<Pick<DesignTokenRecord, 'breakpoints' | 'extensions'>> = {},
): DesignTokenRecord {
  return { uuid, label, group, valueType, value, ...extras };
}

export const fontToken: FontFamilyDefinition = font;

export function tokenSet(
  families: { [Family in keyof DesignTokenSet]?: DesignTokenSet[Family] } = {},
): DesignTokenSet {
  return {
    color: families.color ?? {},
    space: families.space ?? {},
    radius: families.radius ?? {},
    shadow: families.shadow ?? {},
    type: families.type ?? {},
    font: families.font ?? {},
  };
}

export const colorTokens = {
  [blue500.uuid]: blue500,
  [blue600.uuid]: blue600,
  [accent.uuid]: accent,
};

/** Full canonical example data used by integration-level token tests. */
export const testTokens = exampleTokens;

/** Canonical spacing record for minimal CSS cases that need only one token. */
export const space4Token = space4;
