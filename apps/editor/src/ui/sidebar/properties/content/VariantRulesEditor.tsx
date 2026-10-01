import type { FieldDefinition, FlatNode, VariantPreset, VariantRule } from '@facadeur/core';
import {
  DisplayConditionEditor,
  fieldPathOptions,
} from '../../../controls/data/DataDirectivesEditorControl.js';
import { Field, Section, Select, Stack } from '../../../form/index.js';

export function VariantRulesEditor({
  node,
  fields,
  presets,
  variantLabels,
  onChange,
  onInvalid,
}: {
  node: Extract<FlatNode, { type: 'instance' }>;
  fields: FieldDefinition[];
  presets?: VariantPreset[];
  variantLabels?: Readonly<Record<string, string>>;
  onChange: (value: VariantRule[] | null) => void;
  onInvalid?: (message: string) => void;
}) {
  const paths = fieldPathOptions(fields);
  const rules = node.variantRules ?? [];
  const variantOptions = [
    { value: 'default', label: variantLabels?.default?.trim() || 'Default' },
    ...(presets ?? [])
      .filter((preset) => preset.name !== 'default')
      .map((preset) => ({
        value: preset.name,
        label: variantLabels?.[preset.name]?.trim() || preset.name,
      })),
  ];

  function addRule() {
    const path = paths[0]?.value;
    const variant = variantOptions[0]?.value;
    if (!path || !variant) return;
    onChange([...rules, { when: { path, truthy: true }, variant }]);
  }

  function patchRule(index: number, patch: Partial<VariantRule>) {
    const next = rules.map((rule, ruleIndex) =>
      ruleIndex === index ? { ...rule, ...patch } : rule,
    );
    onChange(next);
  }

  function moveRule(index: number, delta: -1 | 1) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= rules.length) return;
    const next = [...rules];
    const current = next[index];
    const adjacent = next[nextIndex];
    if (!current || !adjacent) return;
    next[index] = adjacent;
    next[nextIndex] = current;
    onChange(next);
  }

  return (
    <Section title="Variant rules" collapsible defaultOpen>
      {node.variants?.variant ? (
        <p className="meta">Explicit selection takes priority; clear it to use rules.</p>
      ) : null}
      {rules.length === 0 ? <p className="meta">No instance variant rules yet.</p> : null}
      <Stack gap={12}>
        {rules.map((rule, index) => (
          <div key={`${index}-${rule.variant}`} className="variant-rule-card">
            <DisplayConditionEditor
              condition={rule.when}
              paths={paths}
              title={`Rule ${index + 1} condition`}
              namePrefix={`variant-rule-${index}-`}
              onChange={(when) => {
                if (when) patchRule(index, { when });
              }}
              onInvalid={onInvalid}
            />
            <Field label="Variant">
              <Select
                name={`variant-rule-${index}-variant`}
                value={rule.variant}
                options={withMissingVariant(variantOptions, rule.variant)}
                onCommit={(variant) => patchRule(index, { variant })}
              />
            </Field>
            <div className="button-row">
              <button
                type="button"
                className="text-button"
                name={`move-variant-rule-up-${index}`}
                disabled={index === 0}
                onClick={() => moveRule(index, -1)}
              >
                Move up
              </button>
              <button
                type="button"
                className="text-button"
                name={`move-variant-rule-down-${index}`}
                disabled={index === rules.length - 1}
                onClick={() => moveRule(index, 1)}
              >
                Move down
              </button>
              <button
                type="button"
                className="text-button"
                name={`remove-variant-rule-${index}`}
                onClick={() => {
                  const next = rules.filter((_, ruleIndex) => ruleIndex !== index);
                  onChange(next.length ? next : null);
                }}
              >
                Remove rule
              </button>
            </div>
          </div>
        ))}
      </Stack>
      <button
        type="button"
        className="text-button"
        name="add-variant-rule"
        disabled={paths.length === 0 || variantOptions.length === 0}
        onClick={addRule}
      >
        Add variant rule
      </button>
    </Section>
  );
}

function withMissingVariant(
  options: { value: string; label: string }[],
  value: string,
): { value: string; label: string }[] {
  if (!value || options.some((option) => option.value === value)) return options;
  return [{ value, label: `Missing: ${value}` }, ...options];
}
