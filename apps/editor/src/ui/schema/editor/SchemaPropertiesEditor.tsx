import { useId, useState } from 'react';
import type { JsonSchema } from '@facadeur/core';
import {
  BooleanField,
  ChipsField,
  NumberField,
  SelectField,
  TextField,
  type SelectOption,
} from '@facadeur/form';
import { Field } from '../../components/feedback/Field';
import { fieldConfig } from './presets';
import {
  arrayItemKinds,
  draftFromSchema,
  kindOf,
  scalarKinds,
  schemaFromDraft,
  type PropertyDraft,
  type SchemaReferenceTargetChoice,
} from './schema';
import styles from './SchemaPropertiesEditor.module.css';

type SchemaPropertiesEditorProps = {
  properties: Record<string, JsonSchema>;
  required: readonly string[];
  references: readonly SelectOption[];
  referenceTargets: readonly SchemaReferenceTargetChoice[];
  onChange: (properties: Record<string, JsonSchema>, required: string[]) => void;
};

type SchemaPropertyCardProps = {
  name: string;
  schema: JsonSchema;
  required: boolean;
  references: readonly SelectOption[];
  referenceTargets: readonly SchemaReferenceTargetChoice[];
  onChange: (nextName: string, nextSchema: JsonSchema, required: boolean) => void;
  onRemove: () => void;
};

function optionsWithAvailability(
  options: readonly SelectOption[],
  hasReferences: boolean,
): SelectOption[] {
  return options.map((option) =>
    option.value === 'reference' && !hasReferences ? { ...option, disabled: true } : option,
  );
}

function SchemaPropertyCard({
  name,
  schema,
  required,
  references,
  referenceTargets,
  onChange,
  onRemove,
}: SchemaPropertyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const draft = draftFromSchema(name, schema, required);
  const kindConfig = fieldConfig('kind', {
    options: optionsWithAvailability(scalarKinds, references.length > 0),
  });
  const titleConfig = fieldConfig('title');
  const minLengthConfig = fieldConfig('minLength');
  const maxLengthConfig = fieldConfig('maxLength');
  const patternConfig = fieldConfig('pattern');
  const formatConfig = fieldConfig('format');
  const nameConfig = fieldConfig('name', { placeholder: 'propertyName' });
  const descriptionConfig = fieldConfig('description');
  const requiredConfig = fieldConfig('required');
  const referenceConfig = fieldConfig('reference', {
    options: references,
    placeholder: 'Choose a catalog schema…',
  });
  const referenceTargetConfig = fieldConfig('referenceTarget', {
    options: referenceTargets.map(({ target, label }) => ({ value: target, label })),
    placeholder: 'No reference',
  });
  const itemKindConfig = fieldConfig('itemKind', {
    options: optionsWithAvailability(arrayItemKinds, references.length > 0),
  });
  const itemReferenceConfig = fieldConfig('itemReference', {
    options: references,
    placeholder: 'Choose a catalog schema…',
  });
  const itemKind = kindOf(schema.items ?? { type: 'string' });
  const itemReference = typeof schema.items?.$ref === 'string' ? schema.items.$ref : '';

  const commit = (changes: Partial<PropertyDraft>) => {
    const nextDraft = { ...draft, ...changes };
    onChange(nextDraft.name, schemaFromDraft(nextDraft, schema), nextDraft.metadata.required);
  };

  const updateItemKind = (nextKind: string) => {
    const items =
      nextKind === 'reference'
        ? references[0]?.value
          ? { $ref: references[0].value }
          : {}
        : nextKind === 'enum'
          ? { type: 'string', enum: [] }
          : { type: nextKind };
    onChange(name, { ...schema, type: 'array', items }, required);
  };

  const updateStringConstraint = (
    keyword: 'minLength' | 'maxLength' | 'pattern' | 'format',
    value: number | string,
  ) => {
    if (
      (keyword === 'minLength' || keyword === 'maxLength') &&
      typeof value === 'number' &&
      (value < 0 || !Number.isInteger(value))
    ) {
      return;
    }

    const nextSchema = { ...schema };
    if (value === '') delete nextSchema[keyword];
    else nextSchema[keyword] = value;
    onChange(name, nextSchema, required);
  };

  return (
    <fieldset className={styles.card} aria-label={name}>
      <legend className={styles.visuallyHidden}>{name}</legend>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.disclosure}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} field ${name}`}
          aria-expanded={expanded}
          aria-controls={expanded ? bodyId : undefined}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className={expanded ? styles.chevronOpen : styles.chevron} aria-hidden="true" />
        </button>
        <TextField
          id={`${bodyId}-name`}
          name={nameConfig.name}
          aria-label={nameConfig.label}
          placeholder={nameConfig.placeholder}
          value={name}
          onChange={() => {}}
          onCommit={(nextName) => commit({ name: nextName })}
        />
        <TextField
          id={`${bodyId}-description`}
          name={descriptionConfig.name}
          aria-label={`${descriptionConfig.label} for ${name}`}
          placeholder="Add description…"
          value={draft.metadata.description ?? ''}
          onChange={(description) => commit({ metadata: { ...draft.metadata, description } })}
        />
        <div className={styles.headerType}>
          <Field label={kindConfig.label} htmlFor={`${bodyId}-kind`}>
            <SelectField
              id={`${bodyId}-kind`}
              name={kindConfig.name}
              aria-label={`${kindConfig.label} for ${name}`}
              value={draft.kind}
              options={optionsWithAvailability(scalarKinds, references.length > 0)}
              onChange={(kind) =>
                commit({
                  kind,
                  reference: kind === 'reference' ? (references[0]?.value ?? '') : draft.reference,
                })
              }
            />
          </Field>
        </div>
        <div className={styles.headerRequired}>
          <Field label={requiredConfig.label} htmlFor={`${bodyId}-required`}>
            <BooleanField
              id={`${bodyId}-required`}
              name={requiredConfig.name}
              aria-label={`${requiredConfig.label} ${name}`}
              value={required}
              onChange={(nextRequired) =>
                commit({ metadata: { ...draft.metadata, required: nextRequired } })
              }
            />
          </Field>
          <span>{required ? 'Required' : 'Optional'}</span>
        </div>
        <button
          type="button"
          className={styles.remove}
          aria-label={`Remove field ${name}`}
          title={`Remove field ${name}`}
          onClick={onRemove}
        >
          ×
        </button>
      </div>

      {expanded ? (
        <div id={bodyId} className={styles.body}>
          <div className={styles.metadata}>
            <Field label={titleConfig.label} htmlFor={`${bodyId}-title`}>
              <TextField
                id={`${bodyId}-title`}
                name={titleConfig.name}
                value={draft.metadata.title ?? ''}
                onChange={(title) => commit({ metadata: { ...draft.metadata, title } })}
              />
            </Field>
          </div>

          {draft.kind === 'string' || draft.kind === 'enum' ? (
            <div className={styles.stringConstraints}>
              <Field label={minLengthConfig.label} htmlFor={`${bodyId}-min-length`}>
                <NumberField
                  id={`${bodyId}-min-length`}
                  name={minLengthConfig.name}
                  value={typeof schema.minLength === 'number' ? schema.minLength : ''}
                  min={0}
                  step={1}
                  onChange={(value) => updateStringConstraint('minLength', value)}
                />
              </Field>
              <Field label={maxLengthConfig.label} htmlFor={`${bodyId}-max-length`}>
                <NumberField
                  id={`${bodyId}-max-length`}
                  name={maxLengthConfig.name}
                  value={typeof schema.maxLength === 'number' ? schema.maxLength : ''}
                  min={0}
                  step={1}
                  onChange={(value) => updateStringConstraint('maxLength', value)}
                />
              </Field>
              <Field label={patternConfig.label} htmlFor={`${bodyId}-pattern`}>
                <TextField
                  id={`${bodyId}-pattern`}
                  name={patternConfig.name}
                  value={typeof schema.pattern === 'string' ? schema.pattern : ''}
                  onChange={(pattern) => updateStringConstraint('pattern', pattern)}
                />
              </Field>
              <Field
                label={formatConfig.label}
                htmlFor={`${bodyId}-format`}
                hint="Examples: date-time, email, uri, uuid. Custom formats are supported."
              >
                <TextField
                  id={`${bodyId}-format`}
                  name={formatConfig.name}
                  placeholder="e.g. date-time"
                  value={typeof schema.format === 'string' ? schema.format : ''}
                  onChange={(format) => updateStringConstraint('format', format)}
                />
              </Field>
            </div>
          ) : null}

          {draft.kind === 'enum' ? (
            <Field label="Allowed values">
              <ChipsField
                id={`${bodyId}-enum`}
                name="enumValues"
                label="Allowed values"
                value={draft.enumValues}
                placeholder="Add a value…"
                onChange={(enumValues) => commit({ enumValues })}
              />
            </Field>
          ) : null}
          {draft.kind === 'string' && referenceTargets.length ? (
            <Field label="Reference target" htmlFor={`${bodyId}-reference-target`}>
              <SelectField
                id={`${bodyId}-reference-target`}
                name={referenceTargetConfig.name}
                value={draft.referenceTarget}
                options={referenceTargetConfig.options ?? []}
                placeholder={referenceTargetConfig.placeholder}
                onChange={(referenceTarget) => commit({ referenceTarget })}
              />
            </Field>
          ) : null}
          {draft.kind === 'reference' ? (
            <Field label={referenceConfig.label} htmlFor={`${bodyId}-reference`}>
              <SelectField
                id={`${bodyId}-reference`}
                name={referenceConfig.name}
                value={draft.reference}
                options={references}
                placeholder="Choose a catalog schema…"
                onChange={(reference) => commit({ reference })}
              />
            </Field>
          ) : null}
          {draft.kind === 'array' ? (
            <div className={styles.arraySettings}>
              <Field label={itemKindConfig.label} htmlFor={`${bodyId}-item-kind`}>
                <SelectField
                  id={`${bodyId}-item-kind`}
                  name={itemKindConfig.name}
                  value={itemKind}
                  options={optionsWithAvailability(arrayItemKinds, references.length > 0)}
                  onChange={updateItemKind}
                />
              </Field>
              {itemKind === 'reference' ? (
                <Field label={itemReferenceConfig.label} htmlFor={`${bodyId}-item-reference`}>
                  <SelectField
                    id={`${bodyId}-item-reference`}
                    name={itemReferenceConfig.name}
                    value={itemReference}
                    options={references}
                    placeholder="Choose a catalog schema…"
                    onChange={(reference) =>
                      onChange(name, { ...schema, items: { $ref: reference } }, required)
                    }
                  />
                </Field>
              ) : null}
              {itemKind === 'object' ? (
                <SchemaPropertiesEditor
                  properties={schema.items?.properties ?? {}}
                  required={schema.items?.required ?? []}
                  references={references}
                  referenceTargets={referenceTargets}
                  onChange={(properties, itemRequired) =>
                    onChange(
                      name,
                      {
                        ...schema,
                        items: {
                          ...schema.items,
                          type: 'object',
                          properties,
                          required: itemRequired.length ? itemRequired : undefined,
                          additionalProperties: schema.items?.additionalProperties ?? false,
                        },
                      },
                      required,
                    )
                  }
                />
              ) : null}
            </div>
          ) : null}
          {draft.kind === 'object' ? (
            <SchemaPropertiesEditor
              properties={schema.properties ?? {}}
              required={schema.required ?? []}
              references={references}
              referenceTargets={referenceTargets}
              onChange={(properties, nestedRequired) =>
                onChange(
                  name,
                  {
                    ...schema,
                    type: 'object',
                    properties,
                    required: nestedRequired.length ? nestedRequired : undefined,
                    additionalProperties: schema.additionalProperties ?? false,
                  },
                  required,
                )
              }
            />
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}

export function SchemaPropertiesEditor({
  properties,
  required,
  references,
  referenceTargets,
  onChange,
}: SchemaPropertiesEditorProps) {
  const entries = Object.entries(properties);

  const updateProperty = (
    oldName: string,
    nextName: string,
    nextSchema: JsonSchema,
    isRequired: boolean,
  ) => {
    const name = nextName.trim();
    if (!name || (name !== oldName && Object.hasOwn(properties, name))) return;
    const nextProperties: Record<string, JsonSchema> = {};
    for (const [key, value] of Object.entries(properties)) {
      nextProperties[key === oldName ? name : key] = key === oldName ? nextSchema : value;
    }
    const nextRequired = required.filter((field) => field !== oldName && field !== name);
    if (isRequired) nextRequired.push(name);
    onChange(nextProperties, nextRequired);
  };

  const removeProperty = (name: string) => {
    const nextProperties = { ...properties };
    delete nextProperties[name];
    onChange(
      nextProperties,
      required.filter((field) => field !== name),
    );
  };

  return (
    <div className={styles.properties}>
      {entries.map(([name, schema]) => (
        <SchemaPropertyCard
          key={name}
          name={name}
          schema={schema}
          required={required.includes(name)}
          references={references}
          referenceTargets={referenceTargets}
          onChange={(nextName, nextSchema, isRequired) =>
            updateProperty(name, nextName, nextSchema, isRequired)
          }
          onRemove={() => removeProperty(name)}
        />
      ))}
      <button
        type="button"
        className={styles.add}
        onClick={() => {
          let index = entries.length + 1;
          while (Object.hasOwn(properties, `field${index}`)) index += 1;
          const name = `field${index}`;
          onChange({ ...properties, [name]: { type: 'string' } }, [...required]);
        }}
      >
        <span aria-hidden="true">＋</span> Add field
      </button>
    </div>
  );
}
