import { useId, useState } from 'react';
import { Field, Modal } from '../../form/index';
import type { AssetSummary, EditorSession } from '../../../domain/session';

export function GroupAssetDialog({
  session,
  asset,
  groups,
  onClose,
}: {
  session: EditorSession;
  asset: AssetSummary;
  groups: readonly string[];
  onClose: () => void;
}) {
  const [name, setName] = useState(asset.group ?? '');
  const [error, setError] = useState('');
  const listId = useId();
  function add() {
    if (!name.trim()) {
      setError('Enter a group name');
      return;
    }
    const group =
      groups.find((group) => group.toLowerCase() === name.trim().toLowerCase()) ?? name.trim();
    session.setNotice('Asset groups are not available for catalog entries yet.', 'info');
    setError('Not available in catalog-only mode');
  }
  return (
    <Modal
      open
      title="Add to group"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        <>
          <button type="button" className="eu-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="eu-button" onClick={add}>
            Add to group
          </button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Field label="Group name">
          <input
            className="eu-control"
            aria-label="Group name"
            list={listId}
            value={name}
            onChange={(event) => {
              setName(event.currentTarget.value);
              setError('');
            }}
          />
        </Field>
        <datalist id={listId}>
          {groups.map((group) => (
            <option key={group} value={group} />
          ))}
        </datalist>
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </Modal>
  );
}
