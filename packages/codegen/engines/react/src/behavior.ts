import type { BehaviorValue, ComponentBehavior } from '@facadeur/domain';

export function renderBehavior(
  behavior: ComponentBehavior | undefined,
  schemaType: (schema: unknown, callbackProps?: ReadonlySet<string>) => string,
) {
  if (!behavior) return { imports: [] as string[], setup: [] as string[], helpers: [] as string[] };
  const setup: string[] = [];
  const handlers = new Map<
    string,
    {
      nodeUuid: string;
      event: string;
      transitions: ComponentBehavior['transitions'][number]['actions'][];
    }
  >();
  const stateIdentifiers = new Map(
    Object.keys(behavior.state ?? {}).map((name, index) => [name, `behaviorState${index}`]),
  );
  for (const [name, initial] of Object.entries(behavior.state ?? {})) {
    const state = stateIdentifiers.get(name)!;
    const setter = `setBehaviorState${state.slice('behaviorState'.length)}`;
    const stateType = behavior.stateSchema?.[name]
      ? schemaType(behavior.stateSchema[name])
      : Array.isArray(initial)
        ? 'unknown[]'
        : initial === null
          ? 'unknown'
          : typeof initial;
    setup.push(`const [${state}, ${setter}] = useState<${stateType}>(${JSON.stringify(initial)});`);
  }
  for (const transition of behavior.transitions) {
    const key = JSON.stringify([transition.nodeUuid, transition.event]);
    const group = handlers.get(key) ?? {
      nodeUuid: transition.nodeUuid,
      event: transition.event,
      transitions: [],
    };
    group.transitions.push(transition.actions);
    handlers.set(key, group);
  }
  const helpers = [...handlers.values()].map(({ nodeUuid, event, transitions }) => {
    const actions: string[] = [];
    const nextState = new Map<string, string>();
    let temporaryIndex = 0;
    for (const transitionActions of transitions) {
      for (const action of transitionActions) {
        if (action.kind === 'set-state') {
          const expression = behaviorExpression(action.value, stateIdentifiers, nextState);
          const temporary = `nextBehaviorState${temporaryIndex++}`;
          nextState.set(action.name, temporary);
          actions.push(
            `const ${temporary} = ${expression};`,
            `${setterName(action.name, stateIdentifiers)}(${temporary});`,
          );
        } else if (action.kind === 'increment') {
          const expression = `(${nextState.get(action.name) ?? stateIdentifiers.get(action.name)} + ${action.amount ?? 1})`;
          const temporary = `nextBehaviorState${temporaryIndex++}`;
          nextState.set(action.name, temporary);
          actions.push(
            `const ${temporary} = ${expression};`,
            `${setterName(action.name, stateIdentifiers)}(${temporary});`,
          );
        } else if (action.kind === 'move-array-item') {
          const array = nextState.get(action.name) ?? stateIdentifiers.get(action.name) ?? '[]';
          const currentIndex = `repeaterIndices[${JSON.stringify(action.repeaterUuid)}]`;
          const targetIndex =
            action.direction === 'up' || action.direction === 'down'
              ? `(${currentIndex} ${action.direction === 'up' ? '-' : '+'} 1)`
              : `draggedIndex + (targetIndex ${action.direction === 'after' ? '+ 1' : ''})`;
          const temporary = `nextBehaviorState${temporaryIndex++}`;
          if (action.direction === 'up' || action.direction === 'down') {
            actions.push(
              `const ${temporary} = (() => { const current = ${array}; const from = ${currentIndex}; const to = ${targetIndex}; if (!Array.isArray(current) || from === undefined || to < 0 || to >= current.length) return current; const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; })();`,
              `${setterName(action.name, stateIdentifiers)}(${temporary});`,
            );
          } else {
            const native = `((event.nativeEvent as DragEvent).dataTransfer?.getData('application/x-facadeur-repeater') ?? '{}')`;
            actions.push(
              `const ${temporary} = (() => { const current = ${array}; let payload: Record<string, number> = {}; try { payload = JSON.parse(${native}) as Record<string, number>; } catch {} const draggedIndex = payload[${JSON.stringify(action.repeaterUuid)}]; const targetIndex = ${currentIndex}; if (!Array.isArray(current) || draggedIndex === undefined || targetIndex === undefined || draggedIndex < 0 || draggedIndex >= current.length || targetIndex < 0 || targetIndex >= current.length) return current; let to = targetIndex${action.direction === 'after' ? ' + 1' : ''}; if (draggedIndex < to) to -= 1; if (to === draggedIndex || to < 0 || to >= current.length) return current; const next = [...current]; const [item] = next.splice(draggedIndex, 1); next.splice(to, 0, item); return next; })();`,
              `${setterName(action.name, stateIdentifiers)}(${temporary});`,
            );
          }
          nextState.set(action.name, temporary);
        } else if (action.kind === 'emit') {
          actions.push(
            `props[${JSON.stringify(`on${action.name[0]?.toUpperCase() ?? ''}${action.name.slice(1)}`)}]?.(${action.args.map((arg) => behaviorExpression(arg, stateIdentifiers, nextState)).join(', ')});`,
          );
        }
      }
    }
    const handlerName = behaviorHandlerName(nodeUuid, event);
    return `function ${handlerName}(event: SyntheticEvent, repeaterIndices: Readonly<Record<string, number>> = {}) {\n${actions.map((line) => `  ${line}`).join('\n')}\n}`;
  });
  return {
    imports:
      setup.length || helpers.length
        ? [
            `import { ${[...(setup.length ? ['useState'] : []), ...(helpers.length ? ['type SyntheticEvent'] : []), ...(Object.keys(behavior.stateSchema ?? {}).length ? ['Fragment'] : [])].join(', ')} } from 'react';`,
          ]
        : [],
    setup,
    helpers,
  };
}

export function behaviorHandlerName(nodeUuid: string, event: string) {
  const eventCodePoints = [...event].map((character) => character.codePointAt(0)!.toString(16));
  return `handleBehaviorAt${nodeUuid.replaceAll('-', '')}Event${eventCodePoints.join('_')}`;
}

function setterName(name: string, stateIdentifiers: ReadonlyMap<string, string>) {
  const state = stateIdentifiers.get(name);
  if (!state) return 'setBehaviorState';
  return `setBehaviorState${state.slice('behaviorState'.length)}`;
}

function behaviorExpression(
  value: BehaviorValue,
  stateIdentifiers: ReadonlyMap<string, string>,
  nextState: ReadonlyMap<string, string> = new Map(),
): string {
  switch (value.kind) {
    case 'literal':
      return JSON.stringify(value.value);
    case 'state':
      return stateIdentifiers.get(value.name) ?? 'undefined';
    case 'state-after-transition':
      return nextState.get(value.name) ?? stateIdentifiers.get(value.name) ?? 'undefined';
    case 'prop':
      return `getProp(props, ${JSON.stringify(value.path)})`;
    case 'event':
      return `getProp(event, ${JSON.stringify(value.path)})`;
    case 'operation': {
      const expressions = value.values.map((item) =>
        behaviorExpression(item, stateIdentifiers, nextState),
      );
      if (value.operator === 'not') return `!(${expressions[0] ?? 'undefined'})`;
      if (value.operator === 'add')
        return `(${expressions[0] ?? 'undefined'} + ${expressions[1] ?? 'undefined'})`;
      if (value.operator === 'subtract')
        return `(${expressions[0] ?? 'undefined'} - ${expressions[1] ?? 'undefined'})`;
      if (value.operator === 'toggle') return `!(${expressions[0] ?? 'undefined'})`;
      return `Object.is(${expressions[0] ?? 'undefined'}, ${expressions[1] ?? 'undefined'})`;
    }
  }
}
