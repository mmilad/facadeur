import type { BehaviorValue, ComponentBehavior, FieldValue } from '@facadeur/domain';

export interface BehaviorRuntimeContext {
  readonly state: Readonly<Record<string, FieldValue | null>>;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly event?: unknown;
  readonly repeaterIndices?: Readonly<Record<string, number>>;
}

export interface BehaviorRuntimeResult {
  readonly state: Readonly<Record<string, FieldValue | null>>;
  readonly emitted: readonly { readonly name: string; readonly args: readonly unknown[] }[];
  readonly matched: boolean;
}

const initialStateByBehavior = new WeakMap<
  ComponentBehavior,
  Readonly<Record<string, FieldValue | null>>
>();

/** Execute the ordered, declarative transitions for one node event without mutating inputs. */
export function executeComponentBehavior(
  behavior: ComponentBehavior | undefined,
  nodeUuid: string,
  eventName: string,
  context: BehaviorRuntimeContext,
): BehaviorRuntimeResult {
  if (behavior && !initialStateByBehavior.has(behavior)) {
    initialStateByBehavior.set(behavior, { ...context.state });
  }
  const eventStart = { ...context.state };
  const transitions = (behavior?.transitions ?? []).filter(
    (transition) => transition.nodeUuid === nodeUuid && transition.event === eventName,
  );
  if (!transitions.length) {
    return { state: context.state, emitted: [], matched: false };
  }

  const state: Record<string, FieldValue | null> = { ...context.state };
  const initialState = eventStart;
  const emitted: { name: string; args: unknown[] }[] = [];
  for (const transition of transitions) {
    for (const action of transition.actions) {
      if (action.kind === 'set-state') {
        state[action.name] = asFieldValue(evaluate(action.value, context, state, initialState));
      } else if (action.kind === 'increment') {
        const current = state[action.name];
        state[action.name] = (typeof current === 'number' ? current : 0) + (action.amount ?? 1);
      } else if (action.kind === 'append-array-item') {
        const current = state[action.name];
        const itemSchema = behavior?.stateSchema?.[action.name]?.items;
        if (Array.isArray(current) && itemSchema && typeof itemSchema === 'object') {
          const item = defaultItem(itemSchema);
          const keyPath = behavior?.stateArrayKeyPaths?.[action.name];
          if (keyPath && item && typeof item === 'object')
            item[keyPath] = createUniqueKey(current, keyPath);
          state[action.name] = [...current, item];
        }
      } else if (action.kind === 'remove-array-item') {
        const current = state[action.name];
        const index = context.repeaterIndices?.[action.repeaterUuid];
        if (Array.isArray(current) && index !== undefined && index >= 0 && index < current.length) {
          state[action.name] = current.filter((_, itemIndex) => itemIndex !== index);
        }
      } else if (action.kind === 'move-array-item') {
        const current = state[action.name];
        const from =
          action.direction === 'before' || action.direction === 'after'
            ? draggedIndex(context.event, action.repeaterUuid)
            : context.repeaterIndices?.[action.repeaterUuid];
        const targetIndex = context.repeaterIndices?.[action.repeaterUuid];
        if (Array.isArray(current) && from !== undefined && from >= 0 && from < current.length) {
          let to = from;
          if (action.direction === 'up' || action.direction === 'down') {
            to = from + (action.direction === 'up' ? -1 : 1);
          } else if (
            targetIndex !== undefined &&
            targetIndex >= 0 &&
            targetIndex < current.length
          ) {
            to = targetIndex + (action.direction === 'after' ? 1 : 0);
            if (from < to) to -= 1;
          }
          if (to < 0 || to >= current.length || to === from) continue;
          const next = [...current];
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item!);
          state[action.name] = next;
        }
      } else {
        emitted.push({
          name: action.name,
          args: action.args.map((value) => evaluate(value, context, state, initialState)),
        });
      }
    }
  }
  return { state, emitted, matched: true };
}

function defaultItem(schema: unknown) {
  if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
    const type = (schema as Record<string, unknown>).type;
    if (type === 'string') return '';
    if (type === 'number') return 0;
    if (type === 'boolean') return false;
  }
  const properties =
    schema && typeof schema === 'object'
      ? (schema as Record<string, unknown>).properties
      : undefined;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return {};
  return Object.fromEntries(
    Object.entries(properties).map(([name, schema]) => {
      const type =
        schema && typeof schema === 'object' ? (schema as Record<string, unknown>).type : undefined;
      return [name, type === 'boolean' ? false : type === 'number' ? 0 : ''];
    }),
  );
}

function createUniqueKey(items: readonly unknown[], keyPath: string) {
  const used = new Set(
    items.flatMap((item) => {
      const key =
        item && typeof item === 'object' ? (item as Record<string, unknown>)[keyPath] : undefined;
      return typeof key === 'string' ? [key] : [];
    }),
  );
  let key: string =
    globalThis.crypto?.randomUUID?.() ??
    `facadeur-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  while (used.has(key))
    key = `facadeur-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return key;
}

function draggedIndex(event: unknown, repeaterUuid: string) {
  if (!event || typeof event !== 'object') return undefined;
  const dragged = (event as { draggedRepeaterIndices?: unknown }).draggedRepeaterIndices;
  if (!dragged || typeof dragged !== 'object') return undefined;
  const index = (dragged as Record<string, unknown>)[repeaterUuid];
  return typeof index === 'number' && Number.isInteger(index) ? index : undefined;
}

function evaluate(
  value: BehaviorValue,
  context: BehaviorRuntimeContext,
  state: Readonly<Record<string, FieldValue | null>>,
  initialState: Readonly<Record<string, FieldValue | null>>,
): unknown {
  switch (value.kind) {
    case 'literal':
      return value.value;
    case 'state':
      return initialState[value.name];
    case 'state-after-transition':
      return state[value.name];
    case 'prop':
      return valueAtPath(context.props, value.path);
    case 'event':
      return valueAtPath(context.event, value.path);
    case 'operation': {
      const [left, right] = value.values.map((item) =>
        evaluate(item, context, state, initialState),
      );
      switch (value.operator) {
        case 'not':
        case 'toggle':
          return !left;
        case 'add':
          return (
            (typeof left === 'number' ? left : Number(left)) +
            (typeof right === 'number' ? right : Number(right))
          );
        case 'subtract':
          return (
            (typeof left === 'number' ? left : Number(left)) -
            (typeof right === 'number' ? right : Number(right))
          );
        case 'equals':
          return Object.is(left, right);
      }
    }
  }
}

function valueAtPath(value: unknown, path: string) {
  let current = value;
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function asFieldValue(value: unknown): FieldValue | null {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return value;
  if (Array.isArray(value)) return value.map(asFieldValue).filter((item) => item !== null);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).filter(([, item]) => item === null || isFieldValue(item)),
    );
  }
  return null;
}

function isFieldValue(value: unknown): value is FieldValue {
  return (
    value !== null &&
    (typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      Array.isArray(value) ||
      (typeof value === 'object' && Object.values(value).every(isFieldValue)))
  );
}
