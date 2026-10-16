import type {
  ClassCondition,
  ClassConditionLeaf,
  ClassConditionOperand,
  RenderBuildConfig,
  LegacyClassCondition,
  Node,
} from '@facadeur/domain';

export type CodegenRepeaterScope = {
  arrayPath: string;
  itemExpression: string;
  index: number;
};

export function classExpression(
  classes: NonNullable<Node['classes']>,
  propPaths: ReadonlyMap<string, string>,
  styleNodeUuids: readonly string[],
  repeaterScopes: ReadonlyMap<string, CodegenRepeaterScope>,
) {
  const values = classes.map((item) => {
    const condition = item.condition;
    if (!condition) return JSON.stringify(item.name);
    const expression = classConditionExpression(condition, propPaths, repeaterScopes);
    return `${expression} ? ${JSON.stringify(item.name)} : ""`;
  });
  values.push(...styleNodeUuids.map((uuid) => JSON.stringify(`facadeur-node-${uuid}`)));
  return `[${values.join(', ')}].filter(Boolean).join(" ")`;
}

export function classSelector(name: string) {
  return `.${name.replace(/[^A-Za-z0-9_-]/g, (character) => `\\${character.codePointAt(0)!.toString(16)} `)}`;
}

export function childRepeaterScopes(
  source: Node | undefined,
  child: RenderBuildConfig,
  propPaths: ReadonlyMap<string, string>,
  scopes: ReadonlyMap<string, CodegenRepeaterScope>,
) {
  const composition = source?.config?.composition;
  if (!source || composition?.kind !== 'repeater' || !composition.source || !child.renderKey)
    return scopes;
  const index = Number(child.renderKey.split(':')[1]);
  if (!Number.isInteger(index) || index < 0) return scopes;
  const parent = [...scopes.values()].at(-1);
  const arrayPath =
    composition.source.kind === 'prop'
      ? propPaths.get(composition.source.uuid)
      : parent
        ? `${parent.arrayPath}.${composition.source.path}`
        : undefined;
  const arrayExpression =
    composition.source.kind === 'prop' && arrayPath
      ? `getProp(props, ${JSON.stringify(arrayPath)})`
      : composition.source.kind === 'item' && parent
        ? `getProp(${parent.itemExpression}, ${JSON.stringify(composition.source.path)})`
        : undefined;
  if (!arrayPath || !arrayExpression) return scopes;
  return new Map(scopes).set(source.uuid, {
    arrayPath,
    itemExpression: `(${arrayExpression})?.[${index}]`,
    index,
  });
}

function classConditionExpression(
  condition: ClassCondition | LegacyClassCondition,
  propPaths: ReadonlyMap<string, string>,
  repeaterScopes: ReadonlyMap<string, CodegenRepeaterScope>,
): string {
  if (condition.kind === 'prop-equals') {
    const path = propPaths.get(condition.propUuid);
    return path
      ? `Object.is(getProp(props, ${JSON.stringify(path)}), ${JSON.stringify(condition.value)})`
      : 'false';
  }
  if (condition.kind === 'rule') {
    if (!condition.conditions.length) return 'false';
    const operator = condition.operator === 'and' ? '&&' : '||';
    return `(${condition.conditions.map((child) => classConditionExpression(child, propPaths, repeaterScopes)).join(` ${operator} `)})`;
  }
  const left = conditionOperandExpression(condition.left, propPaths, repeaterScopes);
  if (condition.operator === 'is-set') return `(${left} !== undefined && ${left} !== null)`;
  if (condition.operator === 'is-not-set') return `(${left} === undefined || ${left} === null)`;
  if (!condition.right) return 'false';
  const right = conditionOperandExpression(condition.right, propPaths, repeaterScopes);
  const operators: Partial<Record<ClassConditionLeaf['operator'], string>> = {
    equals: 'Object.is(LEFT, RIGHT)',
    'not-equals': '!Object.is(LEFT, RIGHT)',
    'greater-than': 'typeof LEFT === "number" && typeof RIGHT === "number" && LEFT > RIGHT',
    'greater-or-equal': 'typeof LEFT === "number" && typeof RIGHT === "number" && LEFT >= RIGHT',
    'less-than': 'typeof LEFT === "number" && typeof RIGHT === "number" && LEFT < RIGHT',
    'less-or-equal': 'typeof LEFT === "number" && typeof RIGHT === "number" && LEFT <= RIGHT',
    'length-equals': 'Array.isArray(LEFT) && typeof RIGHT === "number" && LEFT.length === RIGHT',
    'length-not-equals':
      'Array.isArray(LEFT) && typeof RIGHT === "number" && LEFT.length !== RIGHT',
    'length-greater-than':
      'Array.isArray(LEFT) && typeof RIGHT === "number" && LEFT.length > RIGHT',
    'length-greater-or-equal':
      'Array.isArray(LEFT) && typeof RIGHT === "number" && LEFT.length >= RIGHT',
    'length-less-than': 'Array.isArray(LEFT) && typeof RIGHT === "number" && LEFT.length < RIGHT',
    'length-less-or-equal':
      'Array.isArray(LEFT) && typeof RIGHT === "number" && LEFT.length <= RIGHT',
  };
  const template = operators[condition.operator];
  return template
    ? template.replaceAll('LEFT', `(${left})`).replaceAll('RIGHT', `(${right})`)
    : 'false';
}

function conditionOperandExpression(
  operand: ClassConditionOperand,
  propPaths: ReadonlyMap<string, string>,
  repeaterScopes: ReadonlyMap<string, CodegenRepeaterScope>,
) {
  if (operand.kind === 'literal') return JSON.stringify(operand.value);
  const match = operand.reference.match(/^\{props:([^}]+)\}$/);
  const itemMatch = operand.reference.match(/^\{item-prop:([^:}]+):([^}]+)\}$/);
  const indexMatch = operand.reference.match(/^\{index:([^}]+)\}$/);
  const legacyItemMatch = operand.reference.match(/^\{item:([^}]+)\}$/);
  if (indexMatch) return String(repeaterScopes.get(indexMatch[1]!)?.index ?? 'undefined');
  if (itemMatch?.[1] && itemMatch[2]) {
    const scope = repeaterScopes.get(itemMatch[1]);
    const path = propPaths.get(itemMatch[2]);
    if (!scope || !path) return 'undefined';
    const itemPath = path.startsWith(`${scope.arrayPath}.`)
      ? path.slice(scope.arrayPath.length + 1)
      : path;
    return `getProp(${scope.itemExpression}, ${JSON.stringify(itemPath)})`;
  }
  if (legacyItemMatch?.[1]) {
    const scope = [...repeaterScopes.values()].at(-1);
    return scope
      ? `getProp(${scope.itemExpression}, ${JSON.stringify(legacyItemMatch[1])})`
      : 'undefined';
  }
  const path = match?.[1] ? propPaths.get(match[1]) : undefined;
  return path ? `getProp(props, ${JSON.stringify(path)})` : 'undefined';
}
