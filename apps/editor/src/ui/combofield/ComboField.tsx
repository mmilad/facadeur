import type { ReactNode } from 'react';
import { TokenValueControl } from '../controls/fields/TokenValueControl';
import styles from './style.module.css';

export type ComboTokenField = {
  key: string;
  label: string;
  name?: string;
  value: string;
  tokens: readonly string[];
  onCommit: (value: string | null) => void;
  placeholder?: string;
  tokenOnly?: boolean;
  color?: boolean;
  hint?: ReactNode;
  action?: ReactNode;
};

export type ComboControlField = {
  key: string;
  label: ReactNode;
  htmlFor?: string;
  control: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
};

export type ComboContentField = {
  key: string;
  content: ReactNode;
};

export type ComboFieldItem = ComboTokenField | ComboControlField | ComboContentField;

export function ComboField({
  fields,
  children,
  legend,
  className,
}: {
  fields: readonly ComboFieldItem[];
  children?: ReactNode;
  legend?: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={[styles.fieldset, className].filter(Boolean).join(' ')}>
      {legend ? <legend>{legend}</legend> : null}
      <div className={styles.content}>
        {fields.map((field) => {
          if ('content' in field) {
            return (
              <div className={styles.wide} key={field.key}>
                {field.content}
              </div>
            );
          }

          const control =
            'control' in field ? (
              field.control
            ) : (
              <TokenValueControl
                name={field.name}
                label={field.label}
                value={field.value}
                tokens={field.tokens}
                onCommit={field.onCommit}
                placeholder={field.placeholder}
                tokenOnly={field.tokenOnly}
                color={field.color}
              />
            );

          return (
            <div className={styles.row} key={field.key}>
              {'control' in field && field.htmlFor ? (
                <label className={styles.label} htmlFor={field.htmlFor}>
                  {field.label}
                </label>
              ) : (
                <span className={styles.label}>{field.label}</span>
              )}
              <div className={styles.control}>{control}</div>
              {(field.hint ?? field.action) ? (
                <div className={styles.meta}>
                  {field.hint}
                  {field.action}
                </div>
              ) : null}
            </div>
          );
        })}
        {children}
      </div>
    </fieldset>
  );
}
