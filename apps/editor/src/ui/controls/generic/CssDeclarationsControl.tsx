import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { ShownDeclaration } from '../../../domain/style-edit.js';
import {
  BorderControl,
  BorderRadiusControl,
  borderDeclarationKeys,
  borderRadiusDeclarationKeys,
  readBorder,
  readBorderRadius,
  serializeBorder,
  serializeBorderRadius,
} from '../border/index.js';
import { Field, Inline, Section, Stack, TextInput } from '../../form/index.js';
import { StyleDeclarationField } from '../style/index.js';
import { styleDeclarationKind } from '../style/declaration-kind.js';
import type { TypographyCatalogs } from '../typography/index.js';
import '../../form/form.css';

export type CssDeclarationEntry = ShownDeclaration & { placeholder?: string };

export type StyleDeclarationCatalogs = {
  colorTokens: readonly string[];
  shadowTokens: readonly string[];
  typographyTokens: readonly string[];
  dimensionTokens: readonly string[];
  radiusTokens: readonly string[];
  typographyCatalogs: TypographyCatalogs;
};

export function CssDeclarationsControl({
  entries,
  variantViewportNote,
  declarationName,
  catalogs,
  onCommitDeclaration,
  onAddDeclaration,
  renderAfterRow,
  emptyMessage = 'No declarations.',
}: {
  entries: CssDeclarationEntry[];
  variantViewportNote?: boolean;
  declarationName: (property: string) => string;
  catalogs: StyleDeclarationCatalogs;
  onCommitDeclaration: (property: string, raw: string, overridden: boolean) => void;
  onAddDeclaration: (property: string, value: string) => void;
  renderAfterRow?: (property: string, overridden: boolean) => ReactNode;
  emptyMessage?: ReactNode;
}) {
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');

  const declarationMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of entries) map[item.property] = item.value;
    return map;
  }, [entries]);

  const borderKeys = new Set(borderDeclarationKeys());
  const radiusKeys = new Set(borderRadiusDeclarationKeys());
  const border = readBorder(declarationMap);
  const borderRadius = readBorderRadius(declarationMap);

  const visibleEntries = entries.filter(
    (item) => !borderKeys.has(item.property) && !radiusKeys.has(item.property),
  );
  const visibleGroups = groupDeclarations(visibleEntries);

  function replaceKeys(remove: readonly string[], set: Record<string, string>) {
    for (const key of remove) {
      const item = entries.find((entry) => entry.property === key);
      if (item) onCommitDeclaration(key, '', item.overridden);
    }
    for (const [key, next] of Object.entries(set)) {
      const item = entries.find((entry) => entry.property === key);
      onCommitDeclaration(key, next, item?.overridden ?? false);
    }
  }

  return (
    <Stack gap={12}>
      {variantViewportNote ? (
        <p className="meta">
          Variant styles stay on Base. Breakpoints are not nested under variants.
        </p>
      ) : null}
      {border ? (
        <Section title="Border" collapsible>
          <BorderControl
            namePrefix={declarationName('border')}
            value={border}
            colorTokens={catalogs.colorTokens}
            onCommit={(next) => {
              replaceKeys(borderDeclarationKeys(), serializeBorder(next));
            }}
          />
        </Section>
      ) : null}
      {borderRadius ? (
        <Section title="Radius" collapsible>
          <BorderRadiusControl
            namePrefix={declarationName('radius')}
            value={borderRadius}
            radiusTokens={catalogs.radiusTokens}
            onCommit={(next) => {
              replaceKeys(borderRadiusDeclarationKeys(), serializeBorderRadius(next));
            }}
          />
        </Section>
      ) : null}
      {visibleEntries.length === 0 && !border && !borderRadius ? (
        <p className="meta">{emptyMessage}</p>
      ) : null}
      {visibleGroups.map((group) => (
        <Section key={group.id} title={group.label} collapsible defaultOpen={group.id !== 'layout'}>
          {group.items.map((item) => (
            <StyleDeclarationField
              key={item.property}
              property={item.property}
              value={item.value}
              placeholder={item.placeholder}
              name={declarationName(item.property)}
              colorTokens={catalogs.colorTokens}
              shadowTokens={catalogs.shadowTokens}
              typographyTokens={catalogs.typographyTokens}
              dimensionTokens={catalogs.dimensionTokens}
              typographyCatalogs={catalogs.typographyCatalogs}
              onCommit={(next) => onCommitDeclaration(item.property, next, item.overridden)}
              after={renderAfterRow?.(item.property, item.overridden)}
            />
          ))}
        </Section>
      ))}
      <Section title="Add property" collapsible defaultOpen={false}>
        <Stack gap={8}>
          <Field label="Property">
            <TextInput
              name={declarationName('property')}
              value={property}
              placeholder="property"
              onChange={setProperty}
            />
          </Field>
          <Field label="Value">
            <Inline gap={8}>
              <TextInput
                name={declarationName('value')}
                value={value}
                placeholder="value"
                onChange={setValue}
              />
            </Inline>
          </Field>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              const name = property.trim();
              if (!name || !value.trim()) return;
              onAddDeclaration(name, value.trim());
              setProperty('');
              setValue('');
            }}
          >
            Add style
          </button>
        </Stack>
      </Section>
    </Stack>
  );
}

type DeclarationGroup = {
  id: DeclarationGroupId;
  label: string;
  items: CssDeclarationEntry[];
};

type DeclarationGroupId =
  | 'color'
  | 'typography'
  | 'layout'
  | 'spacing'
  | 'effects'
  | 'behavior'
  | 'other';

const DECLARATION_GROUP_LABELS: Record<DeclarationGroupId, string> = {
  color: 'Color',
  typography: 'Typography',
  layout: 'CSS layout',
  spacing: 'Spacing',
  effects: 'Effects',
  behavior: 'Behavior',
  other: 'Other',
};

function groupDeclarations(entries: CssDeclarationEntry[]): DeclarationGroup[] {
  const groups: DeclarationGroup[] = [];
  for (const entry of entries) {
    const id = declarationGroupId(entry.property);
    let group = groups.find((candidate) => candidate.id === id);
    if (!group) {
      group = { id, label: DECLARATION_GROUP_LABELS[id], items: [] };
      groups.push(group);
    }
    group.items.push(entry);
  }
  return groups;
}

function declarationGroupId(property: string): DeclarationGroupId {
  if (isLayoutProperty(property)) return 'layout';
  switch (styleDeclarationKind(property)) {
    case 'color':
      return 'color';
    case 'typography':
    case 'typography-token':
      return 'typography';
    case 'spacing':
      return 'spacing';
    case 'shadow':
      return 'effects';
    case 'enum':
      return 'behavior';
    default:
      return 'other';
  }
}

const LAYOUT_PROPERTIES = new Set([
  'align-content',
  'align-items',
  'align-self',
  'aspect-ratio',
  'box-sizing',
  'display',
  'flex',
  'flex-basis',
  'flex-direction',
  'flex-flow',
  'flex-grow',
  'flex-shrink',
  'flex-wrap',
  'height',
  'inset',
  'inset-block',
  'inset-block-end',
  'inset-block-start',
  'inset-inline',
  'inset-inline-end',
  'inset-inline-start',
  'justify-content',
  'justify-items',
  'justify-self',
  'left',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'order',
  'position',
  'right',
  'top',
  'bottom',
  'width',
  'z-index',
]);

function isLayoutProperty(property: string): boolean {
  return LAYOUT_PROPERTIES.has(
    property
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase(),
  );
}
