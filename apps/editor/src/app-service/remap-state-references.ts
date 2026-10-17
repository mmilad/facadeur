import type {
  BehaviorAction,
  BehaviorValue,
  ClassCondition,
  ClassConditionOperand,
  ComponentBehavior,
  LegacyClassCondition,
  Node,
} from '@facadeur/domain';

export function remapBehaviorStateReferences(
  behavior: ComponentBehavior,
  renamed: ReadonlyMap<string, string>,
): ComponentBehavior {
  const mapValue = (value: BehaviorValue): BehaviorValue => {
    if (value.kind === 'state' || value.kind === 'state-after-transition') {
      return { ...value, name: renamed.get(value.name) ?? value.name };
    }
    if (value.kind === 'operation') return { ...value, values: value.values.map(mapValue) };
    return value;
  };
  const mapAction = (action: BehaviorAction): BehaviorAction => {
    if (action.kind === 'set-state') {
      return {
        ...action,
        name: renamed.get(action.name) ?? action.name,
        value: mapValue(action.value),
      };
    }
    if (action.kind === 'increment') {
      return { ...action, name: renamed.get(action.name) ?? action.name };
    }
    if (action.kind === 'move-array-item') {
      return { ...action, name: renamed.get(action.name) ?? action.name };
    }
    return { ...action, args: action.args.map(mapValue) };
  };
  return {
    ...behavior,
    ...(behavior.stateSchema
      ? {
          stateSchema: Object.fromEntries(
            Object.entries(behavior.stateSchema).map(([name, schema]) => [
              renamed.get(name) ?? name,
              schema,
            ]),
          ),
        }
      : {}),
    transitions: behavior.transitions.map((transition) => ({
      ...transition,
      actions: transition.actions.map(mapAction),
    })),
  };
}

export function remapStateReferences(node: Node, renamed: ReadonlyMap<string, string>): Node {
  const mapCondition = (condition: ClassCondition): ClassCondition => {
    if (condition.kind === 'rule') {
      return { ...condition, conditions: condition.conditions.map(mapCondition) };
    }
    return {
      ...condition,
      left: mapOperand(condition.left, renamed),
      ...(condition.right ? { right: mapOperand(condition.right, renamed) } : {}),
    };
  };
  const classes = node.classes?.map((item) => {
    const condition = item.condition;
    if (!condition || isLegacyCondition(condition)) return item;
    return { ...item, condition: mapCondition(condition) };
  });
  const children = node.dom.children?.map((child) => remapStateReferences(child, renamed));
  const composition = node.config?.composition;
  const source = composition && composition.kind !== 'slot' ? composition.source : undefined;
  const nextSource =
    source?.kind === 'state'
      ? { ...source, name: renamed.get(source.name) ?? source.name }
      : source;
  return {
    ...node,
    ...(classes ? { classes } : {}),
    dom: { ...node.dom, ...(children ? { children } : {}) },
    ...(composition && composition.kind !== 'slot' && source?.kind === 'state'
      ? { config: { ...node.config, composition: { ...composition, source: nextSource } } }
      : {}),
  };
}

function mapOperand(operand: ClassConditionOperand, renamed: ReadonlyMap<string, string>) {
  if (operand.kind !== 'reference') return operand;
  const match = operand.reference.match(/^\{state:([^}]+)\}$/);
  const next = match?.[1] ? renamed.get(match[1]) : undefined;
  return next ? { ...operand, reference: `{state:${next}}` } : operand;
}

function isLegacyCondition(
  condition: ClassCondition | LegacyClassCondition,
): condition is LegacyClassCondition {
  return condition.kind === 'prop-equals';
}
