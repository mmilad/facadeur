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

const extraDefinitionUuid = globalThis.crypto.randomUUID();
const extraRootUuid = globalThis.crypto.randomUUID();

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
      const catalog = await createCatalogDefinition(
        'atoms',
        {
          uuid: extraDefinitionUuid,
          name: 'Logo',
          kind: 'atom',
          schema: { kind: 'ref', uuid: IMAGE_SCHEMA_UUID },
          root: {
            uuid: extraRootUuid,
            dom: { tagName: 'img', attributes: { src: '', alt: '' } },
          },
        },
        storage,
      );
      expect(catalog.atoms[extraDefinitionUuid]?.name).toBe('Logo');
      expect(catalog.atoms[IMAGE_ATOM_UUID]?.name).toBe('Image');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
