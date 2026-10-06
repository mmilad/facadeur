import { isVariantAxis, variantPresets, type FieldValue, type NestedNode } from '@facadeur/core';
import { CodegenError, quote } from '../../names';
import { assertDefault, exposedMemberName, jsLiteral } from '../catalog';
import { childFieldValue, childFieldsForInstance, withChildFieldOverride } from '../child-fields';
import { conditionForNode, dataExpression, variantRuleExpression } from './data-expressions';
import { jsxText } from './jsx-text';
import type { Attr, CatalogEntry, ComponentImport, ElementNode } from '../types';

export function renderInstance(
  node: Extract<NestedNode, { type: 'instance' }>,
  catalog: Map<string, CatalogEntry>,
  imports: Map<string, ComponentImport>,
  owner: CatalogEntry,
  usedProps: Set<string>,
  dataScope: ReadonlyMap<string, string>,
  childFieldsProp: string | undefined,
  localClass: string | undefined,
  structuralProps?: string,
): ElementNode {
  if (node.classes?.length) {
    const utilityClasses = quote(node.classes.join(' '));
    localClass = localClass
      ? `[${localClass}, ${utilityClasses}].filter(Boolean).join(' ')`
      : utilityClasses;
  }
  const target = catalog.get(node.component);
  if (!target) {
    return {
      tag: 'div',
      void: false,
      attrs: [
        { name: 'data-component', value: { kind: 'literal', value: node.component } },
        {
          name: 'className',
          value: localClass
            ? { kind: 'expr', code: `[${localClass}, 'ds-unknown'].join(' ')` }
            : { kind: 'literal', value: 'ds-unknown' },
        },
      ],
      children: [{ text: `Unknown component: ${jsxText(node.component)}` }],
    };
  }
  if (target.document.id !== node.component) {
    throw new CodegenError(`Catalog entry "${node.component}" does not match its document`);
  }
  imports.set(target.component, {
    name: target.component,
    from: `../${target.component}`,
  });
  const attrs: Attr[] = [];
  const repeatScope = dataScope.get('$repeatScope');
  if (repeatScope && target.acceptsContext) {
    if (/\bcontext\b/.test(repeatScope)) usedProps.add('$context');
    attrs.push({
      name: 'context',
      value: { kind: 'expr', code: repeatScope },
    });
  }
  if (localClass)
    attrs.push({
      name: 'className',
      value: { kind: 'expr', code: localClass },
    });
  const forwardedFields = new Set<string>();
  for (const [publicName, path] of Object.entries(owner.document.expose?.fields ?? {})) {
    const prefix = `${node.id}.`;
    if (!path.startsWith(prefix)) continue;
    const member = exposedMemberName(target, path.slice(prefix.length), 'field');
    const source = owner.fields.get(publicName);
    const destination = member ? target.fields.get(member) : undefined;
    if (!source || !destination) continue;
    forwardedFields.add(member!);
    usedProps.add(source.name);
    attrs.push({
      name: destination.name,
      value: withChildFieldOverride(
        { kind: 'expr', code: source.name },
        childFieldValue(childFieldsProp, node.id, member!),
        destination,
      ) ?? { kind: 'expr', code: source.name },
    });
  }
  for (const [publicName, path] of Object.entries(owner.document.expose?.events ?? {})) {
    const prefix = `${node.id}.`;
    if (!path.startsWith(prefix)) continue;
    const member = exposedMemberName(target, path.slice(prefix.length), 'event');
    const source = owner.events.get(publicName);
    const destination = member ? target.events.get(member) : undefined;
    if (!source || !destination) continue;
    usedProps.add(source.name);
    attrs.push({
      name: destination.name,
      value: {
        kind: 'expr',
        code:
          source.eventName && destination.eventName && source.eventName !== destination.eventName
            ? `(forwardedEvent) => ${source.name}?.({ ...forwardedEvent, eventName: ${quote(source.eventName)} })`
            : source.name,
      },
    });
  }
  if (node.forwardFields !== false && !structuralProps) {
    const explicitlyBoundFields = new Set(Object.keys(node.fieldBindings ?? {}));
    const explicitlySetFields = new Set(Object.keys(node.fields ?? {}));
    for (const [fieldName, prop] of target.fields) {
      const source = owner.fields.get(fieldName);
      if (
        !source ||
        forwardedFields.has(fieldName) ||
        explicitlyBoundFields.has(fieldName) ||
        explicitlySetFields.has(fieldName)
      ) {
        continue;
      }
      forwardedFields.add(fieldName);
      usedProps.add(source.name);
      attrs.push({
        name: prop.name,
        value: withChildFieldOverride(
          { kind: 'expr', code: source.name },
          childFieldValue(childFieldsProp, node.id, fieldName),
          prop,
        ) ?? { kind: 'expr', code: source.name },
      });
    }
  }
  const boundFields = new Set<string>();
  for (const [fieldName, path] of Object.entries(node.fieldBindings ?? {})) {
    if (forwardedFields.has(fieldName)) continue;
    const prop = target.fields.get(fieldName);
    if (!prop) {
      throw new CodegenError(
        `Instance "${node.id}" binds unknown field "${fieldName}" on "${node.component}"`,
      );
    }
    boundFields.add(fieldName);
    attrs.push({
      name: prop.name,
      value: { kind: 'expr', code: dataExpression(path, owner, dataScope, usedProps) },
    });
  }
  for (const [fieldName, value] of Object.entries(node.fields ?? {})) {
    if (forwardedFields.has(fieldName) || boundFields.has(fieldName)) {
      // Bound fields use their dynamic data source at runtime. Static instance
      // values remain editor-preview overrides and are not generated for them.
      continue;
    }
    const prop = target.fields.get(fieldName);
    if (!prop) {
      throw new CodegenError(
        `Instance "${node.id}" sets unknown field "${fieldName}" on "${node.component}"`,
      );
    }
    const directField = target.contractFields.get(fieldName);
    if (directField) assertDefault(node.component, directField, value);
    attrs.push({
      name: prop.name,
      value:
        withChildFieldOverride(
          valueAttr(prop.name, value).value,
          childFieldValue(childFieldsProp, node.id, fieldName),
          prop,
        ) ?? valueAttr(prop.name, value).value,
    });
  }
  const providedFields = new Set([
    ...forwardedFields,
    ...boundFields,
    ...Object.keys(node.fields ?? {}),
  ]);
  for (const [fieldName, prop] of target.fields) {
    if (prop.required && !providedFields.has(fieldName) && !structuralProps) {
      throw new CodegenError(
        `Instance "${node.id}" is missing required field "${fieldName}" on "${node.component}"`,
      );
    }
    if (!providedFields.has(fieldName) && !prop.required) {
      const override = childFieldValue(childFieldsProp, node.id, fieldName);
      const value = withChildFieldOverride(undefined, override, prop);
      if (value) attrs.push({ name: prop.name, value });
    }
  }
  const inheritedChildFields = childFieldsForInstance(childFieldsProp, node.id, node.childFields);
  if (inheritedChildFields && target.childFieldsProp) {
    attrs.push({
      name: target.childFieldsProp,
      value: { kind: 'expr', code: inheritedChildFields },
    });
  }
  for (const axis of (target.document.variants ?? []).filter(isVariantAxis)) {
    const value = node.variants?.[axis.name];
    if (value === undefined) continue;
    const prop = target.variants.get(axis.name);
    if (!prop) {
      throw new CodegenError(
        `Instance "${node.id}" sets unknown variant "${axis.name}" on "${node.component}"`,
      );
    }
    if (!axis.values.includes(value)) {
      throw new CodegenError(
        `Instance "${node.id}" uses "${value}" for "${axis.name}", expected ${axis.values.join(', ')}`,
      );
    }
    attrs.push({ name: prop.name, value: { kind: 'literal', value } });
  }
  if (target.namedVariant) {
    const value = node.variants?.variant;
    if (value !== undefined) {
      const presets = variantPresets(target.document);
      if (!presets.some((preset) => preset.name === value)) {
        throw new CodegenError(
          `Instance "${node.id}" uses "${value}" for variant on "${node.component}", expected ${presets.map((preset) => preset.name).join(', ')}`,
        );
      }
      attrs.push({ name: target.namedVariant.name, value: { kind: 'literal', value } });
    } else if (node.variantRules?.length) {
      attrs.push({
        name: target.namedVariant.name,
        value: {
          kind: 'expr',
          code: variantRuleExpression(node.variantRules, owner, dataScope, usedProps),
        },
      });
    }
  } else if (node.variantRules?.length) {
    throw new CodegenError(
      `Instance "${node.id}" uses variant rules but "${node.component}" has no named variants`,
    );
  }
  for (const name of Object.keys(node.variants ?? {})) {
    if (name === 'variant' && target.namedVariant) continue;
    if (!target.variants.has(name)) {
      throw new CodegenError(
        `Instance "${node.id}" sets unknown variant "${name}" on "${node.component}"`,
      );
    }
  }
  return {
    tag: target.component,
    attrs,
    ...(structuralProps ? { spreads: [structuralProps] } : {}),
    children: [],
    void: true,
    ...(node.displayOn
      ? { condition: conditionForNode(node.displayOn, owner, dataScope, usedProps) }
      : {}),
  };
}

function valueAttr(name: string, value: FieldValue): Attr {
  if (typeof value === 'string') return { name, value: { kind: 'literal', value } };
  if (typeof value === 'boolean') return { name, value: { kind: 'bool', value } };
  return { name, value: { kind: 'expr', code: jsLiteral(value) } };
}
