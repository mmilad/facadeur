import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { ShownDeclaration } from '../../../domain/style-edit.js';
import type { LayoutCapabilities } from '../../../domain/layout-capabilities.js';
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
import { styleDeclarationGroup, type StyleDeclarationGroup } from '../style/declaration-kind.js';
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

export type StructuredDeclarationGroup = Extract<
  StyleDeclarationGroup,
  'layout' | 'size' | 'spacing'
>;

export function CssDeclarationsControl({
  entries,
  variantViewportNote,
  declarationName,
  catalogs,
  onCommitDeclaration,
  onPatchDeclarations,
  onAddDeclaration,
  renderStructuredSection,
  renderAfterRow,
  layoutCapabilities,
  emptyMessage = 'No declarations.',
}: {
  entries: CssDeclarationEntry[];
  variantViewportNote?: boolean;
  declarationName: (property: string) => string;
  catalogs: StyleDeclarationCatalogs;
  onCommitDeclaration: (property: string, raw: string, overridden: boolean) => void;
  /** Apply a compound edit as one sparse declaration patch when available. */
  onPatchDeclarations?: (patch: Record<string, string | null>) => void;
  onAddDeclaration: (property: string, value: string) => void;
  /** Let the structured layout editor host these CSS rows in its own section. */
  renderStructuredSection?: (group: StructuredDeclarationGroup, content: ReactNode) => ReactNode;
  renderAfterRow?: (property: string, overridden: boolean) => ReactNode;
  /** Context used to keep existing but inactive layout declarations visible and disabled. */
  layoutCapabilities?: LayoutCapabilities;
  emptyMessage?: ReactNode;
}) {
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');
  const [propertyError, setPropertyError] = useState<string | null>(null);

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
  function replaceKeys(remove: readonly string[], set: Record<string, string>) {
    const nextValues = new Map(Object.entries(set));
    const patch: Record<string, string | null> = {};
    for (const key of remove) {
      if (nextValues.has(key)) continue;
      const item = entries.find((entry) => entry.property === key);
      // `entries` contains effective inherited declarations too. Clearing an
      // inherited value would create a needless local reset and could erase a
      // value from the wrong layer.
      if (item?.overridden) patch[key] = null;
    }
    for (const [key, next] of nextValues) {
      const item = entries.find((entry) => entry.property === key);
      if (!item || item.value !== next) patch[key] = next;
    }
    commitPatch(patch);
  }

  function commitPatch(patch: Record<string, string | null>) {
    const changed = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (changed.length === 0) return;
    if (onPatchDeclarations) {
      onPatchDeclarations(Object.fromEntries(changed));
      return;
    }
    for (const [key, next] of changed) {
      const item = entries.find((entry) => entry.property === key);
      onCommitDeclaration(key, next ?? '', item?.overridden ?? true);
    }
  }

  function compoundAfter(keys: readonly string[]) {
    return renderAfterRow ? (
      <div className="declaration-compound-after">
        {keys.map((key) => {
          const item = entries.find((entry) => entry.property === key);
          return item ? <span key={key}>{renderAfterRow(key, item.overridden)}</span> : null;
        })}
      </div>
    ) : null;
  }

  const groups = groupDeclarations(visibleEntries);
  if (renderStructuredSection) {
    for (const id of ['layout', 'size', 'spacing'] as const) {
      if (!groups.some((group) => group.id === id)) {
        groups.push({ id, label: DECLARATION_GROUP_LABELS[id], items: [] });
      }
    }
  }
  if ((border || borderRadius) && !groups.some((group) => group.id === 'surface')) {
    groups.push({ id: 'surface', label: DECLARATION_GROUP_LABELS.surface, items: [] });
  }
  groups.sort((left, right) => GROUP_ORDER.indexOf(left.id) - GROUP_ORDER.indexOf(right.id));

  return (
    <Stack gap={12}>
      {variantViewportNote ? (
        <p className="meta">
          Variant styles stay on Base. Breakpoints are not nested under variants.
        </p>
      ) : null}
      {visibleEntries.length === 0 && !border && !borderRadius && !renderStructuredSection ? (
        <p className="meta">{emptyMessage}</p>
      ) : null}
      {groups.map((group) => (
        <DeclarationGroupSection
          key={group.id}
          group={group}
          renderStructuredSection={renderStructuredSection}
        >
          {group.conflictsStructured ? (
            <p className="meta css-structure-conflict">
              CSS values here override the structured layout value.
            </p>
          ) : null}
          {group.id === 'surface' && border ? (
            <div className="declaration-compound" key="border-control">
              <BorderControl
                namePrefix={declarationName('border')}
                value={border}
                colorTokens={catalogs.colorTokens}
                onCommit={(next) => replaceKeys(borderDeclarationKeys(), serializeBorder(next))}
              />
              {compoundAfter(borderDeclarationKeys())}
            </div>
          ) : null}
          {group.id === 'surface' && borderRadius ? (
            <div className="declaration-compound" key="radius-control">
              <BorderRadiusControl
                namePrefix={declarationName('radius')}
                value={borderRadius}
                radiusTokens={catalogs.radiusTokens}
                onCommit={(next) =>
                  replaceKeys(borderRadiusDeclarationKeys(), serializeBorderRadius(next))
                }
              />
              {compoundAfter(borderRadiusDeclarationKeys())}
            </div>
          ) : null}
          {group.items.map((item) => (
            <DeclarationRow
              key={item.property}
              item={item}
              declarationName={declarationName}
              catalogs={catalogs}
              layoutCapabilities={layoutCapabilities}
              onCommitDeclaration={onCommitDeclaration}
              renderAfterRow={renderAfterRow}
            />
          ))}
        </DeclarationGroupSection>
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
          {propertyError ? <p className="meta">{propertyError}</p> : null}
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
              const capability = layoutCapabilities?.property(name);
              if (capability && !capability.supported) {
                setPropertyError(
                  capability.reason ?? 'This property is inactive in the current layout context.',
                );
                return;
              }
              onAddDeclaration(name, value.trim());
              setProperty('');
              setValue('');
              setPropertyError(null);
            }}
          >
            Add style
          </button>
        </Stack>
      </Section>
    </Stack>
  );
}

function DeclarationRow({
  item,
  declarationName,
  catalogs,
  layoutCapabilities,
  onCommitDeclaration,
  renderAfterRow,
}: {
  item: CssDeclarationEntry;
  declarationName: (property: string) => string;
  catalogs: StyleDeclarationCatalogs;
  layoutCapabilities?: LayoutCapabilities;
  onCommitDeclaration: (property: string, raw: string, overridden: boolean) => void;
  renderAfterRow?: (property: string, overridden: boolean) => ReactNode;
}) {
  const capability = layoutCapabilities?.property(item.property);
  const disabled = capability ? !capability.supported : false;
  const reset = renderAfterRow?.(item.property, item.overridden);
  const field = (
    <StyleDeclarationField
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
      after={disabled ? undefined : reset}
    />
  );
  if (!disabled) return field;
  return (
    <div className="layout-capability-row">
      <fieldset disabled className="layout-capability-disabled">
        {field}
      </fieldset>
      <p className="meta layout-capability-note">
        {capability?.reason ?? 'This value is inactive in the current layout context.'} {reset}
      </p>
    </div>
  );
}

type DeclarationGroup = {
  id: StyleDeclarationGroup;
  label: string;
  items: CssDeclarationEntry[];
  conflictsStructured?: boolean;
};

function DeclarationGroupSection({
  group,
  renderStructuredSection,
  children,
}: {
  group: DeclarationGroup;
  renderStructuredSection?: (group: StructuredDeclarationGroup, content: ReactNode) => ReactNode;
  children: ReactNode;
}) {
  if (isStructuredGroup(group.id) && renderStructuredSection) {
    const content = group.items.length || group.conflictsStructured ? children : undefined;
    return renderStructuredSection(group.id, content);
  }
  return (
    <Section
      title={group.label}
      collapsible
      defaultOpen={group.id !== 'layout' && group.id !== 'advanced'}
    >
      {children}
    </Section>
  );
}

function isStructuredGroup(group: StyleDeclarationGroup): group is StructuredDeclarationGroup {
  return group === 'layout' || group === 'size' || group === 'spacing';
}

const DECLARATION_GROUP_LABELS: Record<StyleDeclarationGroup, string> = {
  layout: 'CSS layout',
  size: 'Size & Position',
  spacing: 'Spacing',
  surface: 'Surface',
  typography: 'Typography',
  effects: 'Effects',
  visibility: 'Visibility & Interaction',
  advanced: 'CSS rules',
};

const GROUP_ORDER: StyleDeclarationGroup[] = [
  'layout',
  'size',
  'spacing',
  'surface',
  'typography',
  'effects',
  'visibility',
  'advanced',
];

function groupDeclarations(entries: CssDeclarationEntry[]): DeclarationGroup[] {
  const groups: DeclarationGroup[] = [];
  for (const entry of entries) {
    const sourceGroup = styleDeclarationGroup(entry.property);
    const id = declarationGroupId(entry.property);
    let group = groups.find((candidate) => candidate.id === id);
    if (!group) {
      group = {
        id,
        label: DECLARATION_GROUP_LABELS[id],
        items: [],
        conflictsStructured: false,
      };
      groups.push(group);
    }
    if (isStructuredGroup(sourceGroup)) group.conflictsStructured = true;
    group.items.push(entry);
  }
  return groups;
}

function declarationGroupId(property: string): StyleDeclarationGroup {
  return styleDeclarationGroup(property);
}
