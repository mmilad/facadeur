import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createCatalogDefinition,
  readProjectCatalog,
  writeProjectCatalog,
} from '../src/server/project/catalog';
import { initializeProjectFiles } from '../src/server/project/files';
import {
  IMAGE_ATOM_UUID,
  IMAGE_SCHEMA_UUID,
  seedProjectCatalog,
} from '../src/server/project/catalog-seed';

describe('project catalog storage', () => {
  it('seeds and writes catalog on project init', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'facadeur-catalog-'));
    try {
      const storage = { id: 'test-project', directory };
      await initializeProjectFiles(storage);
      const catalog = await readProjectCatalog(storage);
      expect(catalog.schemas?.[IMAGE_SCHEMA_UUID]).toBeTruthy();
      expect(catalog.atoms[IMAGE_ATOM_UUID]?.name).toBe('Image');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('creates atom definition', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'facadeur-catalog-'));
    try {
      const storage = { id: 'test-project', directory };
      await writeProjectCatalog(seedProjectCatalog(), storage);
      const extraUuid = '550e8400-e29b-41d4-a716-446655440004';
      const catalog = await createCatalogDefinition(
        'atoms',
        {
          uuid: extraUuid,
          name: 'Logo',
          kind: 'atom',
          schema: { kind: 'ref', uuid: IMAGE_SCHEMA_UUID },
          root: {
            uuid: '550e8400-e29b-41d4-a716-446655440005',
            dom: { tagName: 'img', attributes: { src: '', alt: '' } },
          },
        },
        storage,
      );
      expect(catalog.atoms[extraUuid]?.name).toBe('Logo');
      expect(catalog.atoms[IMAGE_ATOM_UUID]?.name).toBe('Image');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
