import { useState } from 'react';
import { Field, Modal, Stack } from '../../form/index.js';
import type { AssetSummary, EditorSession } from '../../../domain/session.js';

export function RenameAssetDialog({
  session,
  asset,
  onClose,
}: {
  session: EditorSession;
  asset: AssetSummary;
  onClose: () => void;
}) {
  const [name, setName] = useState(asset.name);
  const [slug, setSlug] = useState(asset.slug ?? asset.id);
  const [error, setError] = useState('');
  function rename() {
    session.executeDocument(asset.id, { type: 'setDocumentMetadata', name, slug });
    const notice = session.getSnapshot().notice;
    const updated = session.project.document(asset.id).manifest;
    if (updated.name !== name.trim() || (updated.slug ?? updated.id) !== slug.trim()) {
      setError(notice?.text ?? 'Rename failed');
      return;
    }
    onClose();
  }
  return (
    <Modal
      open
      title="Rename asset"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        <>
          <button type="button" className="eu-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="eu-button" onClick={rename}>
            Rename
          </button>
        </>
      }
    >
      <Stack>
        <Field label="Name">
          <input
            className="eu-control"
            aria-label="Asset name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </Field>
        <Field label="Identifier">
          <input
            className="eu-control"
            aria-label="Asset identifier"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
          />
        </Field>
        <p className="meta">
          The identifier appears in the project list. Existing component references stay connected.
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </Stack>
    </Modal>
  );
}
