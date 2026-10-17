import { DocumentError } from '../../../document/errors';
import type {
  BehaviorValue,
  ClassCondition,
  LegacyClassCondition,
  Node,
  ProjectCatalog,
} from '@facadeur/domain';
import { matchesPartialSchemaValue } from '../../validation/json-schema-value';
import { listCatalogDefinitions, resolveJsonSchemaForDefinition } from './ops';
import { schemaPathExists } from './schema-path';

export function assertComponentBehaviorIntegrity(catalog: ProjectCatalog) {
  for (const { definition } of listCatalogDefinitions(catalog)) {
    const behavior = definition.behavior;
    if (behavior && definition.kind !== 'component') {
      throw new DocumentError(
        'schema',
        `Behavior is only supported on component definitions ("${definition.name}").`,
      );
    }
    const stateNames = new Set(Object.keys(behavior?.state ?? {}));
    const nodes = new Set<string>();
    const allNodes: Node[] = [];
    const repeaters = new Map<string, string | undefined>();
    const repeaterMembers = new Map<string, Set<string>>();
    const visit = (node: Node, repeaterAncestors: readonly string[] = []) => {
      nodes.add(node.uuid);
      allNodes.push(node);
      for (const repeaterUuid of repeaterAncestors) {
        const members = repeaterMembers.get(repeaterUuid) ?? new Set<string>();
        members.add(node.uuid);
        repeaterMembers.set(repeaterUuid, members);
      }
      if (node.config?.composition?.kind === 'repeater') {
        repeaters.set(
          node.uuid,
          node.config.composition.source?.kind === 'state'
            ? node.config.composition.source.name
            : undefined,
        );
        repeaterMembers.set(node.uuid, new Set());
      }
      for (const classDefinition of node.classes ?? []) {
        if (classDefinition.condition) {
          visitCondition(classDefinition.condition, stateNames, definition.name);
        }
      }
      const childAncestors =
        node.config?.composition?.kind === 'repeater'
          ? [...repeaterAncestors, node.uuid]
          : repeaterAncestors;
      for (const child of node.dom.children ?? []) visit(child, childAncestors);
    };
    visit(definition.root);
    if (!behavior) continue;
    for (const [name, initial] of Object.entries(behavior.state ?? {})) {
      if (Array.isArray(initial) && !behavior.stateSchema?.[name]) {
        throw new DocumentError(
          'schema',
          `Array behavior state "${name}" requires an explicit state schema (${definition.name}).`,
        );
      }
      const stateSchema = behavior.stateSchema?.[name];
      if (
        stateSchema &&
        !matchesPartialSchemaValue(initial, stateSchema as Record<string, unknown>)
      ) {
        throw new DocumentError(
          'schema',
          `Initial value for behavior state "${name}" does not match its schema (${definition.name}).`,
        );
      }
    }
    for (const name of Object.keys(behavior.stateSchema ?? {})) {
      if (!stateNames.has(name)) {
        throw new DocumentError(
          'schema',
          `Unknown behavior state schema "${name}" (${definition.name}).`,
        );
      }
    }
    for (const node of allNodes) {
      const source =
        node.config?.composition?.kind === 'repeater' ? node.config.composition.source : undefined;
      if (source?.kind === 'state') {
        const stateSchema = behavior.stateSchema?.[source.name];
        if (!stateNames.has(source.name) || stateSchema?.type !== 'array') {
          throw new DocumentError(
            'schema',
            `Repeater state source "${source.name}" must reference an array state with a declared schema (${definition.name}).`,
          );
        }
      }
    }
    const schema = resolveJsonSchemaForDefinition(catalog, definition) as Record<string, unknown>;
    const props =
      schema.properties && typeof schema.properties === 'object'
        ? (schema.properties as Record<string, unknown>)
        : {};
    const checkValue = (value: BehaviorValue) => {
      if (
        (value.kind === 'state' || value.kind === 'state-after-transition') &&
        !stateNames.has(value.name)
      ) {
        throw new DocumentError(
          'schema',
          `Unknown behavior state "${value.name}" (${definition.name}).`,
        );
      }
      if (value.kind === 'prop' && !schemaPathExists(schema, value.path)) {
        throw new DocumentError(
          'schema',
          `Unknown behavior prop "${value.path}" (${definition.name}).`,
        );
      }
      if (value.kind === 'operation') {
        const expected = value.operator === 'not' || value.operator === 'toggle' ? 1 : 2;
        if (value.values.length !== expected) {
          throw new DocumentError(
            'schema',
            `Behavior operation "${value.operator}" expects ${expected} value(s) (${definition.name}).`,
          );
        }
        value.values.forEach(checkValue);
      }
    };
    for (const transition of behavior.transitions) {
      if (!nodes.has(transition.nodeUuid)) {
        throw new DocumentError(
          'schema',
          `Behavior event references unknown node "${transition.nodeUuid}" (${definition.name}).`,
        );
      }
      for (const action of transition.actions) {
        if (action.kind === 'set-state' && !stateNames.has(action.name)) {
          throw new DocumentError(
            'schema',
            `Behavior transition sets unknown state "${action.name}" (${definition.name}).`,
          );
        }
        if (action.kind === 'increment' && !stateNames.has(action.name)) {
          throw new DocumentError(
            'schema',
            `Behavior transition increments unknown state "${action.name}" (${definition.name}).`,
          );
        }
        if (action.kind === 'increment' && typeof behavior.state?.[action.name] !== 'number') {
          throw new DocumentError(
            'schema',
            `Behavior transition increments non-numeric state "${action.name}" (${definition.name}).`,
          );
        }
        if (
          action.kind === 'move-array-item' &&
          (!Array.isArray(behavior.state?.[action.name]) ||
            repeaters.get(action.repeaterUuid) !== action.name ||
            !repeaterMembers.get(action.repeaterUuid)?.has(transition.nodeUuid))
        ) {
          throw new DocumentError(
            'schema',
            `Behavior move-item action must target an array state and an event node inside its Repeater (${definition.name}).`,
          );
        }
        if (
          action.kind === 'emit' &&
          !Object.hasOwn(props, `on${action.name[0]?.toUpperCase() ?? ''}${action.name.slice(1)}`)
        ) {
          throw new DocumentError(
            'schema',
            `Behavior emit "${action.name}" has no matching callback prop (${definition.name}).`,
          );
        }
        if (action.kind === 'set-state') checkValue(action.value);
        if (action.kind === 'emit') action.args.forEach(checkValue);
      }
    }
  }
}

function visitCondition(
  condition: ClassCondition | LegacyClassCondition,
  stateNames: ReadonlySet<string>,
  definitionName: string,
) {
  if (condition.kind === 'rule') {
    condition.conditions.forEach((child) => visitCondition(child, stateNames, definitionName));
    return;
  }
  if (condition.kind !== 'condition') return;
  for (const operand of [condition.left, condition.right]) {
    if (operand?.kind !== 'reference') continue;
    const match = operand.reference.match(/^\{state:([^}]+)\}$/);
    if (match?.[1] && !stateNames.has(match[1])) {
      throw new DocumentError(
        'schema',
        `Class condition references unknown behavior state "${match[1]}" (${definitionName}).`,
      );
    }
  }
}
