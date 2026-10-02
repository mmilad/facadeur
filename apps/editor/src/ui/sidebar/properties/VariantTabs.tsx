import { useState } from 'react';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { ownsVariantContract, variantSummaries } from '../../../domain/edits/variant-edit.js';
import { createNamedVariant, renameNamedVariant } from '../../../domain/variant-actions.js';
import { VariantActionButton } from '../../controls/variants/VariantActionButton.js';
import { AddPopover, Field, TextInput } from '../../form/index.js';

export function VariantTabs({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [newName, setNewName] = useState('');
  if (!ownsVariantContract(snap.document.kind)) return null;

  const variants = variantSummaries(snap.document);
  function addVariant() {
    if (createNamedVariant(session, newName)) setNewName('');
  }

  return (
    <div className="variant-tabs" role="tablist" aria-label="Component variants">
      <div className="variant-tabs-head">
        <span className="variant-tabs-label">Variant</span>
        <AddPopover label="Add variant" onConfirm={addVariant}>
          <Field label="Name">
            <TextInput
              name="new-variant-name"
              value={newName}
              placeholder="compact"
              onChange={setNewName}
            />
          </Field>
        </AddPopover>
      </div>
      <div className="variant-tabs-list">
        {variants.map((variant) => {
          const active = (snap.activeVariantName ?? 'default') === variant.name;
          return (
            <div key={variant.name} className="variant-tab-entry">
              <VariantActionButton
                role="tab"
                name={`variant-tab-${variant.name}`}
                label={variant.label}
                onRename={(label) => renameNamedVariant(session, variant.name, label)}
                className={active ? 'variant-tab is-active' : 'variant-tab'}
                aria-selected={active}
                onClick={() => session.setActiveVariant(variant.isDefault ? null : variant.name)}
              >
                {variant.label}
              </VariantActionButton>
            </div>
          );
        })}
      </div>
    </div>
  );
}
