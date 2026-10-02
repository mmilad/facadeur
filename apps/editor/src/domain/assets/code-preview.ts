import {
  generateReact,
  type GenerateReactOptions,
  type GeneratedFile,
} from '@facadeur/codegen-react';

export type CodePreviewInput = GenerateReactOptions & {
  documentId: string;
};

export type CodePreviewResult = { source?: string; error?: string };

/** Generate the selected component's source for the editor schema preview. */
export function codePreview({
  documentId,
  documents,
  design,
}: CodePreviewInput): CodePreviewResult {
  try {
    const files = generateReact({ documents, design }).ui;
    const component = files.find(
      (file: GeneratedFile) =>
        file.path.endsWith('/component.tsx') &&
        file.contents.includes(`data-component='${documentId}'`),
    );
    if (!component) return { error: `No generated component was found for "${documentId}".` };
    const directory = component.path.slice(0, -'/component.tsx'.length);
    const types = files.find((file) => file.path === `${directory}/types.ts`);
    return {
      source: types ? `${types.contents}\n${component.contents}` : component.contents,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not generate React preview.' };
  }
}
