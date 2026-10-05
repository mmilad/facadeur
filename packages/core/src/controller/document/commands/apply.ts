import {
  defineVariant,
  removeVariant,
  removeVariantPreset,
  setVariantPreset,
} from '../../variants/commands.js';
import { DocumentError } from '../../../document/errors.js';
import { canonicalizeFlat, type FlatDocument } from '../../../document/flat.js';
import { validateDefinitions } from '../../validation/definitions.js';
import { validateLibraries, validateTree } from '../../validation/tree.js';
import type { Command, CommandContext } from './types.js';
import { insertNode, moveNode, removeNode, wrapNode } from './nodes/structure.js';
import { setChildField, setField, setProp, setVariant } from './nodes/properties.js';
import { defineEvent, defineField, removeEvent, removeField, setExpose } from './definitions.js';
import { adoptTokenReads } from '../../style/references/adopt.js';
import { applyStyleCommand } from '../../style/commands.js';
import { setSchemaCatalog, setSchemaUse } from './schema-contract.js';

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
      moveNode(next, command, ctx);
      break;
    case 'wrap':
      wrapNode(next, command, ctx);
      break;
    case 'setProp':
      setProp(next, command, ctx);
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
      defineEvent(next, command.event, {
        ...(command.previousName !== undefined ? { previousName: command.previousName } : {}),
        ...(command.bindings !== undefined ? { bindings: command.bindings } : {}),
      });
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
    case 'removeVariantPreset':
      removeVariantPreset(next, command.name);
      break;
    case 'setToken':
    case 'removeToken':
    case 'setTokenGroup':
    case 'removeTokenGroup':
    case 'setFont':
    case 'removeFont':
    case 'setBreakpoints':
    case 'setStyleBlock':
    case 'setStyle':
    case 'setVariantStyleBlock':
    case 'setTokenInterface':
    case 'setComponentToken':
    case 'removeComponentToken':
    case 'renameComponentTokenPath':
      applyStyleCommand(next, command, ctx);
      break;
    case 'setSchemaCatalog':
      setSchemaCatalog(next, command.schemaCatalog);
      break;
    case 'setSchemaUse':
      setSchemaUse(next, command.schemaUse);
      break;
    default: {
      const unreachable: never = command;
      throw new DocumentError('schema', `Unknown command ${JSON.stringify(unreachable)}`);
    }
  }
  const canonical = canonicalizeFlat(next);
  validateDefinitions(canonical, ctx.schemaResolverContext);
  validateLibraries(canonical);
  validateTree(canonical, ctx);
  return canonical;
}
