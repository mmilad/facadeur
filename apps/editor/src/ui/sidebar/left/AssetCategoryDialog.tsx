import { useState } from 'react';
import { TextField } from '@facadeur/form';
import { Stack } from '../../components/layout';
import { Modal } from '../../components/overlay';
import type { SidebarAsset } from '../../../domain/sidebar/types';

export function AssetCategoryDialog({
  asset,
  onSetCategory,
  onClose,
}: {
  asset: SidebarAsset;
  onSetCategory: (id: string, category: string | undefined) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(asset.category ?? '');

  function save() {
    const path = category
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean)
      .join('/');
    onSetCategory(asset.id, path || undefined);
    onClose();
  }

  return (
    <Modal
      open
      title="Set component category"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        <>
          <button type="button" onClick={save}>
            Save
          </button>{' '}
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <Stack>
        <TextField
          id="asset-category"
          name="asset-category"
          label="Category path"
          value={category}
          onChange={setCategory}
        />
        <p className="side-note">
          Use / to create nested groups, for example UI/Sidebar. Leave empty to remove the category.
        </p>
      </Stack>
    </Modal>
  );
}
