import React, { useId } from 'react';
import { LayoutField } from '../fields/layout';
import { FormField } from '../field';
import { updateFormValues } from './update-form-values';
import styles from './Form.module.css';
import type { FormProps } from './types';

export function Form<T extends Record<string, unknown>>({
  value,
  fields,
  onChange,
  className,
  layout = 'stacked',
  bindOptions = [],
  renderTextField,
}: FormProps<T>) {
  const id = useId();
  const classNames = [styles.form, className].filter(Boolean).join(' ');
  const renderFields = (
    items: readonly FormProps<T>['fields'][number][],
    path: number[] = [],
  ): React.ReactNode[] =>
    items.map((field, index) => {
      const fieldPath = [...path, index].join('-');
      if (field.type === 'layout') {
        return (
          <LayoutField key={`layout-${fieldPath}`}>
            {renderFields(field.fields, [...path, index])}
          </LayoutField>
        );
      }

      return (
        <FormField
          key={`${fieldPath}-${field.name}`}
          field={field}
          id={`${id}-${fieldPath}`}
          layout={layout}
          value={value[field.name]}
          values={value}
          bindOptions={bindOptions}
          renderTextField={renderTextField}
          onChange={(next, nestedMeta) => {
            const previous = value[field.name];
            if (!nestedMeta && Object.is(previous, next)) return;
            onChange(
              updateFormValues(value, fields, field.name, next),
              nestedMeta
                ? { ...nestedMeta, path: `${field.name}.${nestedMeta.path}` }
                : { path: field.name, previous, next },
            );
          }}
        />
      );
    });

  return (
    <div className={classNames} data-layout={layout}>
      {renderFields(fields)}
    </div>
  );
}
