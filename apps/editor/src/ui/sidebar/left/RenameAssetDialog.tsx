import { useState } from 'react';
import { TextField } from '@facadeur/form';
import { Stack } from '../../components/layout';
import { Modal } from '../../components/overlay';
import type { SidebarAsset } from '../../../domain/sidebar/types';

export function RenameAssetDialog({
  asset,
  onRename,
  onClose,
}: {
  asset: SidebarAsset;
  onRename: (id: string, name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(asset.label);
  const [error, setError] = useState('');

  async function rename() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name');
      return;
    }
    onRename(asset.id, trimmed);
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
          <button type="button" onClick={() => void rename()}>
            Save
          </button>{' '}
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <Stack>
        <TextField id="asset-name" name="asset-name" label="Name" value={name} onChange={setName} />
        {error ? <p className="notice notice-error">{error}</p> : null}
      </Stack>
    </Modal>
  );
}
