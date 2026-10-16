import type {
  ClassCondition,
  ClassConditionLeaf,
  ClassConditionOperand,
  ClassConditionOperator,
  LegacyClassCondition,
} from '@facadeur/domain';
import { classConditionOperatorsForType } from '@facadeur/core';

type ConditionOption = { value: string; label: string; valueType?: string };

export function ClassConditionEditor({
  condition,
  options,
  onChange,
}: {
  condition: ClassCondition | LegacyClassCondition | undefined;
  options: readonly ConditionOption[];
  onChange: (condition: ClassCondition | null) => void;
}) {
  const tree = condition ? normalizeCondition(condition) : null;
  return (
    <section className="class-condition-editor" aria-label="Class condition">
      <label className="class-condition-toggle">
        <input
          type="checkbox"
          checked={tree !== null}
          disabled={!options.length}
          onChange={(event) =>
            onChange(
              event.currentTarget.checked
                ? { kind: 'rule', operator: 'and', conditions: [newLeaf(options)] }
                : null,
            )
          }
        />
        Apply class condition
      </label>
      {tree ? (
        <ConditionNodeEditor
          node={tree}
          options={options}
          onChange={onChange}
          onRemove={() => onChange(null)}
        />
      ) : null}
      {!options.length ? <small>Component props are needed to create a condition.</small> : null}
    </section>
  );
}

function ConditionNodeEditor({
  node,
  options,
  onChange,
  onRemove,
  canRemove = true,
}: {
  node: ClassCondition;
  options: readonly ConditionOption[];
  onChange: (condition: ClassCondition) => void;
  onRemove: () => void;
  canRemove?: boolean;
}) {
  if (node.kind === 'condition') {
    return (
      <ConditionLeafEditor
        condition={node}
        options={options}
        onChange={onChange}
        onRemove={onRemove}
        canRemove={canRemove}
      />
    );
  }
  return (
    <fieldset className="class-condition-rule">
      <legend>Condition group</legend>
      <div className="class-condition-row">
        <select
          aria-label="Condition group operator"
          value={node.operator}
          onChange={(event) =>
            onChange({ ...node, operator: event.currentTarget.value as 'and' | 'or' })
          }
        >
          <option value="and">All conditions (AND)</option>
          <option value="or">Any condition (OR)</option>
        </select>
        {canRemove ? (
          <button type="button" aria-label="Remove condition group" onClick={onRemove}>
            ×
          </button>
        ) : null}
      </div>
      {node.conditions.map((child, index) => (
        <ConditionNodeEditor
          key={index}
          node={child}
          options={options}
          onChange={(next) => replaceChild(node, index, next, onChange)}
          onRemove={() =>
            onChange({
              ...node,
              conditions:
                node.conditions.length > 1
                  ? node.conditions.filter((_, i) => i !== index)
                  : node.conditions,
            })
          }
          canRemove={node.conditions.length > 1}
        />
      ))}
      <div className="class-condition-actions">
        <button
          type="button"
          onClick={() => onChange({ ...node, conditions: [...node.conditions, newLeaf(options)] })}
        >
          Add condition
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...node,
              conditions: [
                ...node.conditions,
                { kind: 'rule', operator: 'and', conditions: [newLeaf(options)] },
              ],
            })
          }
        >
          Add group
        </button>
      </div>
    </fieldset>
  );
}

function ConditionLeafEditor({
  condition,
  options,
  onChange,
  onRemove,
  canRemove = true,
}: {
  condition: ClassConditionLeaf;
  options: readonly ConditionOption[];
  onChange: (condition: ClassConditionLeaf) => void;
  onRemove: () => void;
  canRemove?: boolean;
}) {
  const selected = options.find((option) => option.value === refFor(condition.left));
  const comparisonOptions = options.filter(
    (option) =>
      !selected?.valueType ||
      !option.valueType ||
      option.valueType === selected.valueType ||
      (['number', 'integer'].includes(option.valueType) &&
        ['number', 'integer'].includes(selected.valueType)),
  );
  const operators = classConditionOperatorsForType(selected?.valueType);
  const operator = operators.includes(condition.operator) ? condition.operator : 'is-set';
  const hasRight = operator !== 'is-set' && operator !== 'is-not-set';
  const right = condition.right ?? { kind: 'literal' as const, value: '' };
  return (
    <div className="class-condition-leaf">
      <div className="class-condition-row">
        <select
          aria-label="Condition property"
          value={refFor(condition.left)}
          onChange={(event) => {
            const option = options.find((entry) => entry.value === event.currentTarget.value);
            const nextOperators = classConditionOperatorsForType(option?.valueType);
            onChange({
              ...condition,
              left: { kind: 'reference', reference: event.currentTarget.value },
              operator: nextOperators.includes(condition.operator)
                ? condition.operator
                : (nextOperators[0] as ClassConditionOperator),
              right: undefined,
            });
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Condition operator"
          value={operator}
          onChange={(event) =>
            onChange({
              ...condition,
              operator: event.currentTarget.value as ClassConditionOperator,
            })
          }
        >
          {operators.map((item) => (
            <option key={item} value={item}>
              {operatorLabel(item)}
            </option>
          ))}
        </select>
        {hasRight ? (
          <>
            <select
              aria-label="Comparison value kind"
              value={right.kind}
              onChange={(event) =>
                onChange({
                  ...condition,
                  right:
                    event.currentTarget.value === 'reference'
                      ? { kind: 'reference', reference: comparisonOptions[0]?.value ?? '' }
                      : { kind: 'literal', value: '' },
                })
              }
            >
              <option value="literal">Value</option>
              <option value="reference" disabled={!comparisonOptions.length}>
                Another prop
              </option>
            </select>
            {right.kind === 'reference' ? (
              <select
                aria-label="Comparison property"
                value={right.reference}
                onChange={(event) =>
                  onChange({
                    ...condition,
                    right: { kind: 'reference', reference: event.currentTarget.value },
                  })
                }
              >
                {comparisonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : selected?.valueType === 'boolean' ? (
              <select
                aria-label="Comparison value"
                value={right.value === true ? 'true' : right.value === false ? 'false' : ''}
                onChange={(event) =>
                  onChange({
                    ...condition,
                    right: { kind: 'literal', value: event.currentTarget.value === 'true' },
                  })
                }
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                aria-label="Comparison value"
                type={
                  selected?.valueType === 'number' ||
                  selected?.valueType === 'integer' ||
                  operator.startsWith('length-')
                    ? 'number'
                    : 'text'
                }
                value={String(right.value ?? '')}
                onChange={(event) =>
                  onChange({
                    ...condition,
                    right: {
                      kind: 'literal',
                      value: literalValue(event.currentTarget.value, selected?.valueType, operator),
                    },
                  })
                }
              />
            )}
          </>
        ) : null}
        {canRemove ? (
          <button type="button" aria-label="Remove condition" onClick={onRemove}>
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

function newLeaf(options: readonly ConditionOption[]): ClassConditionLeaf {
  return {
    kind: 'condition',
    left: { kind: 'reference', reference: options[0]?.value ?? '' },
    operator: 'is-set',
  };
}

function normalizeCondition(condition: ClassCondition | LegacyClassCondition): ClassCondition {
  if (condition.kind === 'prop-equals') {
    return {
      kind: 'condition',
      left: { kind: 'reference', reference: `{props:${condition.propUuid}}` },
      operator: 'equals',
      right: { kind: 'literal', value: condition.value },
    };
  }
  return condition;
}

function refFor(operand: ClassConditionOperand) {
  return operand.kind === 'reference' ? operand.reference : '';
}

function replaceChild(
  rule: Extract<ClassCondition, { kind: 'rule' }>,
  index: number,
  child: ClassCondition,
  onChange: (condition: ClassCondition) => void,
) {
  onChange({ ...rule, conditions: rule.conditions.map((item, i) => (i === index ? child : item)) });
}

function operatorLabel(operator: string) {
  return (
    (
      {
        'is-set': 'is set',
        'is-not-set': 'is not set',
        equals: 'equals',
        'not-equals': 'does not equal',
        'greater-than': 'is greater than',
        'greater-or-equal': 'is at least',
        'less-than': 'is less than',
        'less-or-equal': 'is at most',
        'length-equals': 'length equals',
        'length-not-equals': 'length does not equal',
        'length-greater-than': 'length is greater than',
        'length-greater-or-equal': 'length is at least',
        'length-less-than': 'length is less than',
        'length-less-or-equal': 'length is at most',
      } as Record<string, string>
    )[operator] ?? operator
  );
}

function literalValue(value: string, type: string | undefined, operator: string) {
  if (operator.startsWith('length-') || type === 'number' || type === 'integer')
    return value === '' ? 0 : Number(value);
  if (type === 'boolean') return value === 'true';
  return value;
}
