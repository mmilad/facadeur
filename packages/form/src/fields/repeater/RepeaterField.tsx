import React from 'react';
import { Form } from '../../form/Form';
import styles from './RepeaterField.module.css';
import type { RepeaterFieldProps } from './types';

export function RepeaterField({
  label,
  itemLabel,
  itemFields,
  createItem,
  value,
  onChange,
}: RepeaterFieldProps) {
  const items = value.filter(isRecord);

  return (
    <fieldset className={styles.repeater}>
      <legend className={styles.legend}>{label}</legend>
      {items.map((item, index) => (
        <section className={styles.item} key={index}>
          <h3 className={styles.itemTitle}>
            {itemLabel} {index + 1}
          </h3>
          <Form
            value={item}
            fields={itemFields}
            onChange={(next, meta) => {
              const nextItems = items.map((current, itemIndex) =>
                itemIndex === index ? next : current,
              );
              onChange(nextItems, {
                ...meta,
                path: `${index}.${meta.path}`,
              });
            }}
          />
          <button
            className={styles.removeButton}
            type="button"
            onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
          >
            Remove {itemLabel.toLowerCase()}
          </button>
        </section>
      ))}
      <button
        className={styles.addButton}
        type="button"
        onClick={() => onChange([...items, { ...createItem }])}
      >
        Add {itemLabel.toLowerCase()}
      </button>
    </fieldset>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
