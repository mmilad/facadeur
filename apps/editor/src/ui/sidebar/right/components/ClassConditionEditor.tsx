import type {
  ClassCondition,
  ClassConditionLeaf,
  ClassConditionOperand,
  ClassConditionOperator,
  LegacyClassCondition,
} from '@facadeur/domain';
import { classConditionOperatorsForType } from '@facadeur/core';
import { Checkbox, NumberInput, Select, TextInput } from '../../../controls/form-binding';
import { Field } from '../../../components/feedback';

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
      <Checkbox
        label="Apply class condition"
        value={tree !== null}
        disabled={!options.length}
        onChange={(checked) =>
          onChange(
            checked ? { kind: 'rule', operator: 'and', conditions: [newLeaf(options)] } : null,
          )
        }
      />
      {tree ? (
        <ConditionNodeEditor
          node={tree}
          options={options}
          onChange={onChange}
          onRemove={() => onChange(null)}
        />
      ) : null}
      {!options.length ? (
        <small>Add a component prop or internal state to create a condition.</small>
      ) : null}
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
        <Select
          aria-label="Condition group operator"
          value={node.operator}
          className="class-condition-control"
          options={[
            { value: 'and', label: 'All conditions (AND)' },
            { value: 'or', label: 'Any condition (OR)' },
          ]}
          onChange={(value) => onChange({ ...node, operator: value as 'and' | 'or' })}
        />
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
  const right = condition.right ?? defaultRightOperand(selected?.valueType);
  return (
    <div className="class-condition-leaf">
      <div className="class-condition-row">
        <Select
          aria-label="Condition property"
          value={refFor(condition.left)}
          className="class-condition-control"
          options={options}
          onChange={(value) => {
            const option = options.find((entry) => entry.value === value);
            const nextOperators = classConditionOperatorsForType(option?.valueType);
            const nextOperator = nextOperators.includes(condition.operator)
              ? condition.operator
              : (nextOperators[0] as ClassConditionOperator);
            onChange({
              ...condition,
              left: { kind: 'reference', reference: value },
              operator: nextOperator,
              right:
                nextOperator === 'is-set' || nextOperator === 'is-not-set'
                  ? undefined
                  : defaultRightOperand(option?.valueType),
            });
          }}
        />
        <Select
          aria-label="Condition operator"
          value={operator}
          className="class-condition-control"
          options={operators.map((item) => ({ value: item, label: operatorLabel(item) }))}
          onChange={(value) => {
            const nextOperator = value as ClassConditionOperator;
            onChange({
              ...condition,
              operator: nextOperator,
              ...(nextOperator !== 'is-set' && nextOperator !== 'is-not-set' && !condition.right
                ? { right: defaultRightOperand(selected?.valueType) }
                : {}),
            });
          }}
        />
        {hasRight ? (
          <>
            <Select
              aria-label="Comparison value kind"
              value={right.kind}
              className="class-condition-control"
              options={[
                { value: 'literal', label: 'Value' },
                {
                  value: 'reference',
                  label: 'Another prop or state',
                  disabled: !comparisonOptions.length,
                },
              ]}
              onChange={(value) =>
                onChange({
                  ...condition,
                  right:
                    value === 'reference'
                      ? { kind: 'reference', reference: comparisonOptions[0]?.value ?? '' }
                      : { kind: 'literal', value: '' },
                })
              }
            />
            {right.kind === 'reference' ? (
              <Select
                aria-label="Comparison property"
                value={right.reference}
                className="class-condition-control"
                options={comparisonOptions}
                onChange={(value) =>
                  onChange({ ...condition, right: { kind: 'reference', reference: value } })
                }
              />
            ) : right.kind === 'literal' && selected?.valueType === 'boolean' ? (
              <Select
                aria-label="Comparison value"
                value={right.value === true ? 'true' : right.value === false ? 'false' : ''}
                className="class-condition-control"
                options={[
                  { value: 'true', label: 'true' },
                  { value: 'false', label: 'false' },
                ]}
                onChange={(value) =>
                  onChange({ ...condition, right: { kind: 'literal', value: value === 'true' } })
                }
              />
            ) : (
              <Field label="Comparison value">
                {selected?.valueType === 'number' ||
                selected?.valueType === 'integer' ||
                operator.startsWith('length-') ? (
                  <NumberInput
                    aria-label="Comparison value"
                    value={typeof right.value === 'number' ? right.value : Number(right.value) || 0}
                    onChange={(value) =>
                      onChange({
                        ...condition,
                        right: {
                          kind: 'literal',
                          value: literalValue(
                            value === null ? '' : String(value),
                            selected?.valueType,
                            operator,
                          ),
                        },
                      })
                    }
                  />
                ) : (
                  <TextInput
                    className="class-condition-control"
                    aria-label="Comparison value"
                    value={String(right.value ?? '')}
                    onChange={(value) =>
                      onChange({
                        ...condition,
                        right: {
                          kind: 'literal',
                          value: literalValue(value, selected?.valueType, operator),
                        },
                      })
                    }
                  />
                )}
              </Field>
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

function defaultRightOperand(valueType: string | undefined): ClassConditionOperand {
  const value =
    valueType === 'boolean' ? true : valueType === 'number' || valueType === 'integer' ? 0 : '';
  return { kind: 'literal', value };
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
