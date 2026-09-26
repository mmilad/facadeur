import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ShownDeclaration } from '../../../domain/style-edit.js';
import { Field, Inline, Stack, TextInput } from '../../form/index.js';
import '../../form/form.css';

export type CssDeclarationEntry = ShownDeclaration & { placeholder?: string };

export function CssDeclarationsControl({
  entries,
  variantViewportNote,
  declarationName,
  onCommitDeclaration,
  onAddDeclaration,
  renderAfterRow,
}: {
  entries: CssDeclarationEntry[];
  variantViewportNote?: boolean;
  declarationName: (property: string) => string;
  onCommitDeclaration: (property: string, raw: string, overridden: boolean) => void;
  onAddDeclaration: (property: string, value: string) => void;
  renderAfterRow?: (property: string, overridden: boolean) => ReactNode;
}) {
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');

  return (
    <Stack gap={8}>
      {variantViewportNote ? (
        <p className="meta">
          Variant styles stay on Base. Breakpoints are not nested under variants.
        </p>
      ) : null}
      {entries.length === 0 ? <p className="meta">No declarations.</p> : null}
      {entries.map((item) => (
        <div key={item.property}>
          <Field label={item.property}>
            <TextInput
              name={declarationName(item.property)}
              value={item.value}
              placeholder={item.placeholder}
              onCommit={(next) => onCommitDeclaration(item.property, next, item.overridden)}
            />
          </Field>
          {renderAfterRow?.(item.property, item.overridden)}
        </div>
      ))}
      <Field label="Add property">
        <Inline gap={8}>
          <TextInput
            name={declarationName('property')}
            value={property}
            placeholder="property"
            onChange={setProperty}
          />
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
  );
}
