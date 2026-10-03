import { describe, expect, it } from 'vitest';
import { generate } from '../src/index';
import { generateReact } from '../engines/react/src/generate';
import type { DocumentFile } from '@facadeur/core';

const document: DocumentFile = {
  version: 1,
  id: 'codegen-entry',
  name: 'Codegen entry',
  kind: 'component',
  root: { id: 'root', type: 'frame', tag: 'div' },
};

describe('codegen entry point', () => {
  it('uses React when no engine is specified', () => {
    expect(generate({ documents: [document] })).toEqual(generateReact({ documents: [document] }));
  });

  it('allows callers to pin React explicitly', () => {
    expect(generate({ documents: [document], engine: 'react' })).toEqual(
      generate({ documents: [document] }),
    );
  });
});
