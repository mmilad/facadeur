import { DocumentError } from '../document/errors.js';
import { canonicalizeFlat, type FlatDocument } from '../document/flat.js';
import { parseStyleBlock, parseTokenInterface } from '../styles/style-block.js';
import {
  removeGroupFromTree,
  removeTokenFromTree,
  setGroupInTree,
  setTokenInTree,
} from '../token-tree.js';
import { validateDefinitions } from '../validation/definitions.js';
import { validateLibraries, validateTree } from '../validation/tree.js';
import type { Command, CommandContext } from './types.js';
import { insertNode, moveNode, removeNode, wrapNode } from './structure.js';
import { adoptTokenReads } from './token-reads.js';
import { setChildField, setField, setProp, setStyle, setVariant } from './node.js';
import {
  defineEvent,
  defineField,
  defineVariant,
  removeEvent,
  removeField,
  removeVariant,
  removeVariantPreset,
  setExpose,
  setVariantPreset,
  setVariantStyleBlock,
} from './definitions.js';
import {
  removeComponentToken,
  renameComponentTokenPath,
  setComponentToken,
} from './component-tokens.js';
import { removeFont, setBreakpoints, setFont } from './design.js';

export type { Command, CommandContext, InsertNode, NodeProp } from './types.js';

/**
 * Pure command application. The input document is not mutated.
 * `move.index` is the position in the target child list after the node has been
 * removed from its current parent.
 */
export function applyCommand(
  doc: FlatDocument,
  command: Command,
  ctx: CommandContext = {},
): FlatDocument {
  if (command.type === 'batch') {
    return command.commands.reduce(
      (current, item) => applyCommand(current, item, ctx),
      structuredClone(canonicalizeFlat(doc)),
    );
  }
  const next = structuredClone(canonicalizeFlat(doc));
  switch (command.type) {
    case 'insert':
      insertNode(next, command, ctx);
      break;
    case 'remove':
      removeNode(next, command.nodeId);
      break;
    case 'move':
      moveNode(next, command);
      break;
    case 'wrap':
      wrapNode(next, command, ctx);
      break;
    case 'setProp':
      setProp(next, command);
      break;
    case 'setStyle':
      setStyle(next, command);
      break;
    case 'setField':
      setField(next, command);
      break;
    case 'setChildField':
      setChildField(next, command, ctx);
      break;
    case 'setVariant':
      setVariant(next, command);
      break;
    case 'defineField':
      defineField(next, command.field);
      break;
    case 'setPreviewData':
      if (command.previewData) next.previewData = structuredClone(command.previewData);
      else delete next.previewData;
      break;
    case 'setVariantLabels':
      if (command.labels && Object.keys(command.labels).length)
        next.variantLabels = { ...command.labels };
      else delete next.variantLabels;
      break;
    case 'removeField':
      removeField(next, command.name);
      break;
    case 'defineEvent':
      defineEvent(next, command.event);
      break;
    case 'removeEvent':
      removeEvent(next, command.name);
      break;
    case 'setExpose':
      setExpose(next, command.expose);
      break;
    case 'defineVariant':
      defineVariant(next, command.axis);
      break;
    case 'removeVariant':
      removeVariant(next, command.name);
      break;
    case 'setVariantPreset':
      setVariantPreset(next, command.preset);
      adoptTokenReads(next);
      break;
    case 'createVariantPreset': {
      const label = command.label.trim();
      if (
        !label ||
        command.name === 'default' ||
        next.variantPresets?.some((preset) => preset.name === command.name)
      ) {
        throw new DocumentError('schema', 'A new variant needs a unique name and a nonempty label');
      }
      setVariantPreset(next, { name: command.name });
      next.variantLabels = {
        ...(next.variantLabels ?? {}),
        default: next.variantLabels?.default ?? 'Default',
        [command.name]: label,
      };
      break;
    }
    case 'setVariantStyleBlock':
      setVariantStyleBlock(next, command);
      adoptTokenReads(next);
      break;
    case 'removeVariantPreset':
      removeVariantPreset(next, command.name);
      break;
    case 'setToken':
      next.tokens = setTokenInTree(next.tokens, command.path, command.token);
      break;
    case 'removeToken':
      next.tokens = removeTokenFromTree(next.tokens, command.path);
      break;
    case 'setTokenGroup':
      next.tokens = setGroupInTree(next.tokens, command.path, command.group);
      break;
    case 'removeTokenGroup':
      next.tokens = removeGroupFromTree(next.tokens, command.path);
      break;
    case 'setFont':
      setFont(next, command.font);
      break;
    case 'removeFont':
      removeFont(next, command.id);
      break;
    case 'setBreakpoints':
      setBreakpoints(next, command.breakpoints);
      break;
    case 'setStyleBlock':
      if (command.style === null) delete next.styles;
      else next.styles = parseStyleBlock(command.style);
      adoptTokenReads(next);
      break;
    case 'setTokenInterface':
      if (command.tokenInterface === null) delete next.tokenInterface;
      else next.tokenInterface = parseTokenInterface(command.tokenInterface);
      break;
    case 'setComponentToken': {
      const globalPaths = ctx.globalTokenPaths;
      if (!globalPaths) {
        throw new DocumentError(
          'schema',
          'setComponentToken requires globalTokenPaths in the command context',
        );
      }
      setComponentToken(next, command.id, command.path, command.token, globalPaths);
      break;
    }
    case 'removeComponentToken':
      removeComponentToken(next, command.id);
      break;
    case 'renameComponentTokenPath': {
      const globalPaths = ctx.globalTokenPaths;
      if (!globalPaths) {
        throw new DocumentError(
          'schema',
          'renameComponentTokenPath requires globalTokenPaths in the command context',
        );
      }
      renameComponentTokenPath(next, command.id, command.path, globalPaths);
      break;
    }
    default: {
      const unreachable: never = command;
      throw new DocumentError('schema', `Unknown command ${JSON.stringify(unreachable)}`);
    }
  }
  const canonical = canonicalizeFlat(next);
  validateDefinitions(canonical);
  validateLibraries(canonical);
  validateTree(canonical, ctx);
  return canonical;
}
