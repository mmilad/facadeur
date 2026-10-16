import type { SchemaRecursionEntry } from './schema-recursion';
import { schemaRecursionWarnings } from './schema-recursion';
import styles from './SchemaRecursionWarnings.module.css';

export function SchemaRecursionWarnings({
  schemas,
  selectedId,
}: {
  schemas: readonly SchemaRecursionEntry[];
  selectedId: string;
}) {
  const warnings = schemaRecursionWarnings(schemas, selectedId);
  if (!warnings.length) return null;

  return (
    <aside className={styles.warnings} aria-label="Schema recursion warnings" role="status">
      <strong>Possible required recursion</strong>
      <ul>
        {warnings.map((warning) => (
          <li key={warning.id}>{warning.path}</li>
        ))}
      </ul>
      <p>
        These reference cycles have no optional-field or array exit detected. Saving is allowed;
        complex union branches may still provide a valid base case.
      </p>
    </aside>
  );
}
