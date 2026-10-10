import { useState } from 'react';
import { TextField } from '@facadeur/form';
import { Stack } from '../../components/layout';
import { Modal } from '../../components/overlay';
import type { AppService } from '../../../app-service';
import type { AssetSummary } from '../../../domain/session';

export function RenameAssetDialog({
  app,
  asset,
  onClose,
}: {
  app: AppService;
  asset: AssetSummary;
  onClose: () => void;
}) {
  const [name, setName] = useState(asset.name);
  const [error, setError] = useState('');

  async function rename() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name');
      return;
    }
    try {
      await app.patchDefinition(asset.id, { name: trimmed });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Rename failed');
    }
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
