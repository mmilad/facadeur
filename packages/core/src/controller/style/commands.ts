import { DocumentError } from '../../document/errors';
import { makeFlatNode, type FlatDocument } from '../../document/flat';
import type { Breakpoint } from '../../schema/document';
import type { CommandContext } from '../../legacy/flat/document/commands/types';
import { setVariantStyleBlock } from '../../legacy/flat/variants/commands';
import type { StyleCommand } from './types';
import {
  removeTokenFromTree,
  setTokenInTree,
} from './tokens/global/tree';
import {
  removeComponentToken,
  renameComponentTokenPath,
  setComponentToken,
} from './tokens/component/commands';
import { adoptTokenReads } from './references/adopt';
import { parseStyleBlock, parseTokenInterface } from './blocks/parse';
import { assertStyleMap } from './blocks/contract';
import { assertBreakpoints, cloneBreakpoints } from './breakpoints';

/** Mutates only the working document supplied by pure command application; owns no project state. */
export function applyStyleCommand(
  doc: FlatDocument,
  command: StyleCommand,
  context: CommandContext,
) {
  switch (command.type) {
    case 'setToken':
      doc.tokens = setTokenInTree(doc.tokens, command.family, command.token);
      break;
    case 'removeToken':
      doc.tokens = removeTokenFromTree(doc.tokens, command.family, command.uuid);
      break;
    case 'setBreakpoints':
      setBreakpoints(doc, command.breakpoints);
      break;
    case 'setStyleBlock':
      if (command.style === null) delete doc.styles;
      else doc.styles = parseStyleBlock(command.style);
      adoptTokenReads(doc);
      break;
    case 'setStyle':
      setNodeStyle(doc, command);
      break;
    case 'setVariantStyleBlock':
      setVariantStyleBlock(doc, command);
      adoptTokenReads(doc);
      break;
    case 'setTokenInterface':
      if (command.tokenInterface === null) delete doc.tokenInterface;
      else doc.tokenInterface = parseTokenInterface(command.tokenInterface);
      break;
    case 'setComponentToken':
      setComponentToken(
        doc,
        command.id,
        command.path,
        command.token,
        requireGlobalTokenUuids(context, command.type),
      );
      break;
    case 'removeComponentToken':
      removeComponentToken(doc, command.id);
      break;
    case 'renameComponentTokenPath':
      renameComponentTokenPath(
        doc,
        command.id,
        command.path,
        requireGlobalTokenUuids(context, command.type),
      );
      break;
    default: {
      const unreachable: never = command;
      throw new DocumentError('schema', `Unknown style command ${JSON.stringify(unreachable)}`);
    }
  }
}

function requireGlobalTokenUuids(
  context: CommandContext,
  command: 'setComponentToken' | 'renameComponentTokenPath',
) {
  if (!context.globalTokenUuids) {
    throw new DocumentError(
      'schema',
      `${command} requires globalTokenUuids in the command context`,
    );
  }
  return context.globalTokenUuids;
}

const STYLE_PROPERTY = /^(--)?[A-Za-z_][\w-]*$/;

function setNodeStyle(doc: FlatDocument, command: Extract<StyleCommand, { type: 'setStyle' }>) {
  const node = doc.nodes[command.nodeId];
  if (!node) {
    throw new DocumentError('missing-node', `Node "${command.nodeId}" is not in the document`);
  }
  if (node.type === 'instance')
    throw new DocumentError('nesting', 'Instances cannot carry style overrides');
  if (node.type === 'repeater' || node.type === 'switch') {
    throw new DocumentError('nesting', `${node.type} nodes cannot carry style overrides`);
  }
  if (!STYLE_PROPERTY.test(command.property)) {
    throw new DocumentError('schema', `Invalid style property "${command.property}"`);
  }
  const style = { ...(node.style ?? {}) };
  if (command.value === null) {
    delete style[command.property];
  } else if (typeof command.value === 'string') {
    style[command.property] = command.value;
  } else {
    throw new DocumentError('schema', 'Style values must be strings');
  }
  if (Object.keys(style).length) assertStyleMap(style);
  node.style = style;
  doc.nodes[node.id] = makeFlatNode(node);
  adoptTokenReads(doc);
}

function setBreakpoints(doc: FlatDocument, breakpoints: Breakpoint[]) {
  if (!breakpoints.length) {
    delete doc.settings.breakpoints;
    return;
  }
  assertBreakpoints(breakpoints);
  doc.settings.breakpoints = cloneBreakpoints(breakpoints);
}
