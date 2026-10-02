import {
  ID_PATTERN,
  isJsonValue,
  isPlainObject,
  readTokenTree,
  resolveChildFieldDefinition,
  validateCatalog,
  type Command,
  type CommandContext,
  type DocumentFile,
} from '@facadeur/core';
import { loadTokens } from '@facadeur/tokens';
import { invalid, ProjectError } from './persistence.js';

export function safeId(id: string): void {
  if (
    typeof id !== 'string' ||
    !ID_PATTERN.test(id) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(id)
  ) {
    throw new ProjectError(400, 'Invalid document id');
  }
}

export function validate(files: DocumentFile[]): void {
  invalid(() => {
    validateCatalog(files);
    for (const file of files) {
      safeId(file.id);
      loadTokens({
        tokens: file.tokens,
        fonts: file.fonts,
        breakpoints: file.settings?.breakpoints,
      });
    }
  });
}

export function context(files: DocumentFile[], designId: string): CommandContext {
  const catalog = new Map(files.map((file) => [file.id, file]));
  const design = catalog.get(designId);
  return {
    resolveKind: (id) => catalog.get(id)?.kind,
    resolveChildField: (node, path, field) =>
      resolveChildFieldDefinition(node, path, field, catalog),
    globalTokenPaths: new Set(readTokenTree(design?.tokens ?? {}).tokens.keys()),
    resolveComponentTokenPaths: (id) => {
      const tokens = catalog.get(id)?.componentTokens;
      return tokens ? new Set(Object.values(tokens).map((token) => token.path)) : undefined;
    },
  };
}

// Required fields are checked before pure core command validation, including commands
// whose absent payload would otherwise be interpreted as a reset/no-op.
const required: Record<Command['type'], readonly string[]> = {
  batch: ['commands'],
  insert: ['parentId', 'node'],
  remove: ['nodeId'],
  move: ['nodeId', 'parentId', 'index'],
  wrap: ['nodeId'],
  setProp: ['nodeId', 'prop', 'value'],
  setStyle: ['nodeId', 'property', 'value'],
  setField: ['nodeId', 'field', 'value'],
  setChildField: ['nodeId', 'path', 'field', 'value'],
  setVariant: ['nodeId', 'axis', 'value'],
  defineField: ['field'],
  setPreviewData: ['previewData'],
  setVariantLabels: ['labels'],
  removeField: ['name'],
  defineEvent: ['event'],
  removeEvent: ['name'],
  setExpose: ['expose'],
  defineVariant: ['axis'],
  removeVariant: ['name'],
  setVariantPreset: ['preset'],
  createVariantPreset: ['name', 'label'],
  setVariantStyleBlock: ['name', 'style'],
  removeVariantPreset: ['name'],
  setToken: ['path', 'token'],
  removeToken: ['path'],
  setTokenGroup: ['path', 'group'],
  removeTokenGroup: ['path'],
  setFont: ['font'],
  removeFont: ['id'],
  setBreakpoints: ['breakpoints'],
  setStyleBlock: ['style'],
  setTokenInterface: ['tokenInterface'],
  setComponentToken: ['id', 'path', 'token'],
  removeComponentToken: ['id'],
  renameComponentTokenPath: ['id', 'path'],
};

export function assertCommand(command: Command): void {
  assertNestedCommand(command, 0);
}

function assertNestedCommand(value: unknown, depth: number): void {
  if (
    !isPlainObject(value) ||
    !isJsonValue(value) ||
    typeof value.type !== 'string' ||
    !Object.hasOwn(required, value.type)
  ) {
    throw new ProjectError(400, 'Invalid command');
  }
  const command = value as Command;
  for (const key of required[command.type]) {
    if (!Object.hasOwn(command, key)) throw new ProjectError(400, `Command requires ${key}`);
  }
  if (command.type === 'batch') {
    if (depth >= 8 || !Array.isArray(command.commands) || command.commands.length > 100) {
      throw new ProjectError(
        400,
        'Batch commands must be an array of at most 100 commands, nested at most 8 levels',
      );
    }
    for (const item of command.commands) assertNestedCommand(item, depth + 1);
  }
  for (const key of ['nodeId', 'parentId', 'name', 'path', 'prop', 'property', 'id', 'label']) {
    if (
      Object.hasOwn(command, key) &&
      typeof (command as unknown as Record<string, unknown>)[key] !== 'string'
    ) {
      throw new ProjectError(400, `Command ${key} must be a string`);
    }
  }
  if ('index' in command && (!Number.isSafeInteger(command.index) || Number(command.index) < 0)) {
    throw new ProjectError(400, 'Command index must be a nonnegative integer');
  }
}
