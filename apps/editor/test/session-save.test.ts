import { toFlat, validateDocumentFile } from '@facadeur/core';
import { describe, expect, it, vi } from 'vitest';
import button from '../../../examples/button.json';
import * as files from '../src/domain/assets/files';
import { persistEditorJsonSave } from '../src/domain/session/save';

const flat = toFlat(validateDocumentFile(button));

describe('persistEditorJsonSave', () => {
  it('reports Saved when writing through a file handle', async () => {
    const handle = {} as files.JsonFileHandle;
    const save = vi.spyOn(files, 'saveJsonFile').mockResolvedValue({ via: 'handle', handle });
    const notices: { tone: string; text: string }[] = [];
    let published = 0;
    let marked = false;

    const ok = await persistEditorJsonSave({
      filename: 'button.json',
      document: flat,
      handle,
      onHandle: () => {},
      onMarkedSaved: () => {
        marked = true;
      },
      setNotice: (notice) => notices.push(notice),
      publish: () => {
        published += 1;
      },
    });

    expect(ok).toBe(true);
    expect(save).toHaveBeenCalledWith({
      filename: 'button.json',
      text: files.documentToJson(flat),
      handle,
    });
    expect(notices).toEqual([{ tone: 'info', text: 'Saved button.json' }]);
    expect(marked).toBe(true);
    expect(published).toBe(1);
    save.mockRestore();
  });

  it('reports Downloaded when save falls back to download', async () => {
    const save = vi.spyOn(files, 'saveJsonFile').mockResolvedValue({ via: 'download' });
    const notices: { tone: string; text: string }[] = [];

    const ok = await persistEditorJsonSave({
      filename: 'button.json',
      document: flat,
      onHandle: () => {},
      onMarkedSaved: () => {},
      setNotice: (notice) => notices.push(notice),
      publish: () => {},
    });

    expect(ok).toBe(true);
    expect(notices).toEqual([{ tone: 'info', text: 'Downloaded button.json' }]);
    save.mockRestore();
  });

  it('returns false without a notice when the user aborts', async () => {
    const save = vi
      .spyOn(files, 'saveJsonFile')
      .mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    const notices: { tone: string; text: string }[] = [];
    let published = 0;

    const ok = await persistEditorJsonSave({
      filename: 'button.json',
      document: flat,
      onHandle: () => {},
      onMarkedSaved: () => {},
      setNotice: (notice) => notices.push(notice),
      publish: () => {
        published += 1;
      },
    });

    expect(ok).toBe(false);
    expect(notices).toEqual([]);
    expect(published).toBe(0);
    save.mockRestore();
  });

  it('surfaces other errors as error notices', async () => {
    const save = vi.spyOn(files, 'saveJsonFile').mockRejectedValue(new Error('Disk full'));
    const notices: { tone: string; text: string }[] = [];

    const ok = await persistEditorJsonSave({
      filename: 'button.json',
      document: flat,
      onHandle: () => {},
      onMarkedSaved: () => {},
      setNotice: (notice) => notices.push(notice),
      publish: () => {},
    });

    expect(ok).toBe(false);
    expect(notices).toEqual([{ tone: 'error', text: 'Disk full' }]);
    save.mockRestore();
  });

  it('blocks persistence when catalog validation fails', async () => {
    const save = vi.spyOn(files, 'saveJsonFile');
    const notices: { tone: string; text: string }[] = [];

    const ok = await persistEditorJsonSave({
      filename: 'button.json',
      document: flat,
      validate: () => {
        throw new Error('Invalid expose contract');
      },
      onHandle: () => {},
      onMarkedSaved: () => {},
      setNotice: (notice) => notices.push(notice),
      publish: () => {},
    });

    expect(ok).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(notices).toEqual([{ tone: 'error', text: 'Invalid expose contract' }]);
    save.mockRestore();
  });
});
