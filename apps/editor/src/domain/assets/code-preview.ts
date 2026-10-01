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
    const source = files.find(
      (file: GeneratedFile) =>
        file.path.startsWith('components/') &&
        file.contents.includes(`data-component='${documentId}'`),
    )?.contents;
    if (!source) return { error: `No generated component was found for "${documentId}".` };
    return { source };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not generate React preview.' };
  }
}
