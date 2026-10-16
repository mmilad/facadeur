import type { ReactNode } from 'react';
import type { JsonSchema } from '@facadeur/core';
import styles from './SchemaCompositionEditor.module.css';

type SchemaCompositionEditorProps = {
  kind: 'oneOf' | 'anyOf';
  branches: readonly JsonSchema[];
  onChange: (branches: JsonSchema[]) => void;
  renderBranch: (
    branch: JsonSchema,
    index: number,
    onChange: (schema: JsonSchema) => void,
  ) => ReactNode;
};

export function SchemaCompositionEditor({
  kind,
  branches,
  onChange,
  renderBranch,
}: SchemaCompositionEditorProps) {
  const label = kind === 'oneOf' ? 'One of' : 'Any of';

  return (
    <section className={styles.composition} aria-label={`${label} schemas`}>
      <h3>{label} branches</h3>
      <p>
        {kind === 'oneOf' ? 'Exactly one branch must match.' : 'At least one branch must match.'}
      </p>
      <div className={styles.branches}>
        {branches.map((branch, index) => (
          <fieldset className={styles.branch} key={index}>
            <legend>Branch {index + 1}</legend>
            {renderBranch(branch, index, (next) => {
              onChange(
                branches.map((current, currentIndex) => (currentIndex === index ? next : current)),
              );
            })}
            {branches.length > 1 ? (
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${label.toLowerCase()} branch ${index + 1}`}
                onClick={() =>
                  onChange(branches.filter((_, currentIndex) => currentIndex !== index))
                }
              >
                ×
              </button>
            ) : null}
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        className={styles.add}
        onClick={() => onChange([...branches, { type: 'string' }])}
      >
        Add branch
      </button>
    </section>
  );
}
