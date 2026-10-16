import type {
  ClassCondition,
  ClassConditionLeaf,
  ClassConditionOperand,
  LegacyClassCondition,
} from '@facadeur/domain';
import type { Node } from '@facadeur/domain';
import { resolveReferenceValue, type ReferenceResolutionContext } from './reference-resolver';

const numericOperators = new Set([
  'greater-than',
  'greater-or-equal',
  'less-than',
  'less-or-equal',
  'length-equals',
  'length-not-equals',
  'length-greater-than',
  'length-greater-or-equal',
  'length-less-than',
  'length-less-or-equal',
]);

export function evaluateClassCondition(
  condition: ClassCondition | LegacyClassCondition,
  context: ReferenceResolutionContext,
): boolean {
  if (condition.kind === 'prop-equals') {
    return Object.is(context.componentProps?.[condition.propUuid], condition.value);
  }
  if (condition.kind === 'rule') {
    if (!condition.conditions.length) return false;
    return condition.operator === 'and'
      ? condition.conditions.every((child) => evaluateClassCondition(child, context))
      : condition.conditions.some((child) => evaluateClassCondition(child, context));
  }
  return evaluateLeaf(condition, context);
}

export function effectiveClassList(node: Node, context: ReferenceResolutionContext) {
  return (node.classes ?? [])
    .filter(({ condition }) => !condition || evaluateClassCondition(condition, context))
    .map(({ name }) => name);
}

export function classConditionOperatorsForType(type: string | undefined) {
  const common = ['is-set', 'is-not-set'];
  if (type === 'array')
    return [...common, ...[...numericOperators].filter((op) => op.startsWith('length-'))];
  if (type === 'number' || type === 'integer')
    return [
      ...common,
      'equals',
      'not-equals',
      'greater-than',
      'greater-or-equal',
      'less-than',
      'less-or-equal',
    ];
  if (type === 'string' || type === 'boolean' || type === 'null')
    return [...common, 'equals', 'not-equals'];
  if (type === 'object') return common;
  return [...common, 'equals', 'not-equals'];
}

function evaluateLeaf(condition: ClassConditionLeaf, context: ReferenceResolutionContext) {
  const left = operandValue(condition.left, context);
  if (condition.operator === 'is-set') return left !== undefined && left !== null;
  if (condition.operator === 'is-not-set') return left === undefined || left === null;
  if (!condition.right) return false;
  const right = operandValue(condition.right, context);
  if (condition.operator === 'equals') return Object.is(left, right);
  if (condition.operator === 'not-equals') return !Object.is(left, right);
  const leftNumber = condition.operator.startsWith('length-')
    ? Array.isArray(left)
      ? left.length
      : undefined
    : left;
  if (
    typeof leftNumber !== 'number' ||
    typeof right !== 'number' ||
    !numericOperators.has(condition.operator)
  )
    return false;
  switch (condition.operator) {
    case 'greater-than':
    case 'length-greater-than':
      return leftNumber > right;
    case 'greater-or-equal':
    case 'length-greater-or-equal':
      return leftNumber >= right;
    case 'less-than':
    case 'length-less-than':
      return leftNumber < right;
    case 'less-or-equal':
    case 'length-less-or-equal':
      return leftNumber <= right;
    case 'length-equals':
      return leftNumber === right;
    case 'length-not-equals':
      return leftNumber !== right;
    default:
      return false;
  }
}

function operandValue(
  operand: ClassConditionOperand,
  context: ReferenceResolutionContext,
): unknown {
  return operand.kind === 'literal'
    ? operand.value
    : resolveReferenceValue(operand.reference, context);
}
