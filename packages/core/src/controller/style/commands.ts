import { DocumentError } from '../../document/errors.js';
import { makeFlatNode, type FlatDocument } from '../../document/flat.js';
import type { Breakpoint, FontFamily } from '../../document/schema.js';
import type { CommandContext } from '../document/commands/types.js';
import { setVariantStyleBlock } from '../variants/commands.js';
import type { StyleCommand } from './types.js';
import {
  removeGroupFromTree,
  removeTokenFromTree,
  setGroupInTree,
  setTokenInTree,
} from './tokens/global/tree.js';
import {
  removeComponentToken,
  renameComponentTokenPath,
  setComponentToken,
} from './tokens/component/commands.js';
import { adoptTokenReads } from './references/adopt.js';
import { parseStyleBlock, parseTokenInterface } from './blocks/parse.js';
import { assertStyleMap } from './blocks/contract.js';
import { assertBreakpoints, cloneBreakpoints } from './breakpoints.js';
import { assertFont, cloneFont } from './fonts.js';

/** Mutates only the working document supplied by pure command application; owns no project state. */
export function applyStyleCommand(
  doc: FlatDocument,
  command: StyleCommand,
  context: CommandContext,
) {
  switch (command.type) {
    case 'setToken':
      doc.tokens = setTokenInTree(doc.tokens, command.path, command.token);
      break;
    case 'removeToken':
      doc.tokens = removeTokenFromTree(doc.tokens, command.path);
      break;
    case 'setTokenGroup':
      doc.tokens = setGroupInTree(doc.tokens, command.path, command.group);
      break;
    case 'removeTokenGroup':
      doc.tokens = removeGroupFromTree(doc.tokens, command.path);
      break;
    case 'setFont':
      setFont(doc, command.font);
      break;
    case 'removeFont':
      removeFont(doc, command.id);
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
        requireGlobalTokenPaths(context, command.type),
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
        requireGlobalTokenPaths(context, command.type),
      );
      break;
    default: {
      const unreachable: never = command;
      throw new DocumentError('schema', `Unknown style command ${JSON.stringify(unreachable)}`);
    }
  }
}

function requireGlobalTokenPaths(
  context: CommandContext,
  command: 'setComponentToken' | 'renameComponentTokenPath',
) {
  if (!context.globalTokenPaths) {
    throw new DocumentError(
      'schema',
      `${command} requires globalTokenPaths in the command context`,
    );
  }
  return context.globalTokenPaths;
}

const STYLE_PROPERTY = /^(--)?[A-Za-z_][\w-]*$/;

function setNodeStyle(doc: FlatDocument, command: Extract<StyleCommand, { type: 'setStyle' }>) {
  const node = doc.nodes[command.nodeId];
  if (!node) {
    throw new DocumentError('missing-node', `Node "${command.nodeId}" is not in the document`);
  }
  if (node.type === 'instance') {
    throw new DocumentError('nesting', 'Instances cannot carry style overrides');
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

function setFont(doc: FlatDocument, font: FontFamily) {
  assertFont(font);
  const next = cloneFont(font);
  const index = doc.fonts.findIndex((item) => item.id === next.id);
  if (index === -1) doc.fonts.push(next);
  else doc.fonts[index] = next;
}

function removeFont(doc: FlatDocument, id: string) {
  const index = doc.fonts.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new DocumentError('schema', `Font "${id}" is not defined`);
  }
  doc.fonts.splice(index, 1);
}

function setBreakpoints(doc: FlatDocument, breakpoints: Breakpoint[]) {
  if (!breakpoints.length) {
    delete doc.settings.breakpoints;
    return;
  }
  assertBreakpoints(breakpoints);
  doc.settings.breakpoints = cloneBreakpoints(breakpoints);
}
