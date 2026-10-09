import React from 'react';
import { BooleanField } from '../fields/boolean';
import { ColorField } from '../fields/color';
import { ComboboxField } from '../fields/combobox';
import { NumberField } from '../fields/number';
import { ObjectField } from '../fields/object';
import { RepeaterField } from '../fields/repeater';
import { getSelectOptions, SelectField } from '../fields/select';
import { TextArea } from '../fields/textarea';
import { TextField } from '../fields/text';
import { SearchField } from '../fields/search';
import { ChipsField } from '../fields/chips';
import { RecordField } from '../fields/record';
import styles from './FormField.module.css';
import type { FormFieldProps } from './types';

export function FormField({
  field,
  id,
  layout,
  value,
  values,
  bindOptions,
  onChange,
}: FormFieldProps) {
  const wrapperClassName = [styles.field, styles[layout]].join(' ');

  switch (field.type) {
    case 'text':
      return (
        <div className={wrapperClassName}>
          <label className={styles.label} htmlFor={id}>
            {field.label}
          </label>
          {field.bindable ? (
            <BindableText
              id={id}
              name={field.name}
              label={field.label}
              value={typeof value === 'string' ? value : ''}
              options={bindOptions}
              placeholder={field.placeholder}
              disabled={field.disabled}
              onChange={onChange}
            />
          ) : (
            <TextField
              id={id}
              name={field.name}
              value={typeof value === 'string' ? value : ''}
              placeholder={field.placeholder}
              disabled={field.disabled}
              onChange={onChange}
            />
          )}
        </div>
      );
    case 'textarea':
      return (
        <div className={wrapperClassName}>
          <label className={styles.label} htmlFor={id}>
            {field.label}
          </label>
          <TextArea
            id={id}
            name={field.name}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder}
            disabled={field.disabled}
            rows={field.rows}
            onChange={(next) => onChange(next)}
          />
        </div>
      );
    case 'number':
      return (
        <div className={wrapperClassName}>
          <label className={styles.label} htmlFor={id}>
            {field.label}
          </label>
          <NumberField
            id={id}
            name={field.name}
            value={typeof value === 'number' ? value : ''}
            placeholder={field.placeholder}
            disabled={field.disabled}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(next) => onChange(next)}
          />
        </div>
      );
    case 'search':
      return (
        <div className={wrapperClassName}>
          <label className={styles.label} htmlFor={id}>
            {field.label}
          </label>
          <SearchField
            id={id}
            name={field.name}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder}
            disabled={field.disabled}
            onChange={(next) => onChange(next)}
          />
        </div>
      );
    case 'chips':
      return (
        <div className={wrapperClassName}>
          <label className={styles.label} htmlFor={id}>
            {field.label}
          </label>
          <ChipsField
            id={id}
            name={field.name}
            value={
              Array.isArray(value)
                ? value.filter((item): item is string => typeof item === 'string')
                : []
            }
            suggestions={field.suggestions}
            placeholder={field.placeholder}
            disabled={field.disabled}
            onChange={onChange}
          />
        </div>
      );
    case 'record':
      return (
        <div className={wrapperClassName}>
          <label className={styles.label} htmlFor={id}>
            {field.label}
          </label>
          <RecordField
            id={id}
            name={field.name}
            label={field.label}
            value={isStringRecord(value) ? value : {}}
            keyLabel={field.keyLabel}
            valueLabel={field.valueLabel}
            bindable={field.bindable}
            bindOptions={field.bindable ? bindOptions : []}
            suggestions={field.suggestions}
            disabled={field.disabled}
            onChange={onChange}
          />
        </div>
      );
    case 'color':
      return (
        <div className={wrapperClassName}>
          <label className={styles.label} htmlFor={id}>
            {field.label}
          </label>
          <ColorField
            id={id}
            name={field.name}
            value={typeof value === 'string' ? value : '#000000'}
            disabled={field.disabled}
            onChange={(next) => onChange(next)}
          />
        </div>
      );
    case 'boolean':
      return (
        <div className={[wrapperClassName, styles.boolean].join(' ')}>
          <BooleanField
            id={id}
            name={field.name}
            value={value === true}
            disabled={field.disabled}
            onChange={(next) => onChange(next)}
          />
          <label className={styles.label} htmlFor={id}>
            {field.label}
          </label>
        </div>
      );
    case 'select':
    case 'combobox': {
      const options = getSelectOptions(field, values);
      const current = typeof value === 'string' ? value : '';
      const selected =
        field.type === 'combobox' || options.some((option) => option.value === current)
          ? current
          : (options[0]?.value ?? '');
      const Control = field.type === 'select' ? SelectField : ComboboxField;
      return (
        <div className={wrapperClassName}>
          <label className={styles.label} htmlFor={id}>
            {field.label}
          </label>
          <Control
            id={id}
            name={field.name}
            value={selected}
            options={options}
            disabled={field.disabled}
            onChange={(next) => onChange(next)}
          />
        </div>
      );
    }
    case 'object':
      return (
        <ObjectField
          label={field.label}
          fields={field.fields}
          value={isRecord(value) ? value : {}}
          bindOptions={bindOptions}
          onChange={(next, meta) => onChange(next, meta)}
        />
      );
    case 'repeater':
      return (
        <RepeaterField
          label={field.label}
          itemLabel={field.itemLabel}
          itemFields={field.itemFields}
          createItem={field.createItem}
          value={Array.isArray(value) ? value.filter(isRecord) : []}
          bindOptions={bindOptions}
          onChange={(next, meta) => onChange(next, meta)}
        />
      );
  }
}

function BindableText({
  id,
  name,
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (next: unknown) => void;
}) {
  const bound = options.some((option) => option.value === value);
  const selectedValue = options.some((option) => option.value === value)
    ? value
    : (options[0]?.value ?? '');
  return (
    <div className={styles.bindable}>
      {bound ? (
        <select
          id={id}
          className={styles.bindSelect}
          aria-label={`${label} design prop`}
          value={selectedValue}
          disabled={disabled || options.length === 0}
          onChange={(event) => onChange(event.currentTarget.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <TextField
          id={id}
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
        />
      )}
      {options.length > 0 && (
        <button
          className={styles.bindButton}
          type="button"
          aria-label={bound ? 'Switch to literal value' : 'Bind design prop'}
          disabled={disabled}
          onClick={() => onChange(bound ? '' : selectedValue)}
        >
          {bound ? 'Aa' : '{ }'}
        </button>
      )}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}
