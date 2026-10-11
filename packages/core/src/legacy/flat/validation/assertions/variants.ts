import { DocumentError } from '../../../../document/errors';
import type { VariantPreset } from '../../../../schema/document';

export function assertVariantAxis(axis: {
  name: string;
  values: string[];
  default?: string;
}): void {
  if (!axis.values.length) {
    throw new DocumentError('schema', `Variant "${axis.name}" needs at least one value`);
  }
  if (new Set(axis.values).size !== axis.values.length) {
    throw new DocumentError('schema', `Variant "${axis.name}" has duplicate values`);
  }
  if (axis.default !== undefined && !axis.values.includes(axis.default)) {
    throw new DocumentError(
      'schema',
      `Variant default "${axis.default}" is not a value of "${axis.name}"`,
    );
  }
}

export function assertVariantPreset(variant: VariantPreset): void {
  const overrides = variant.overrides;
  if (variant.name === 'default' && hasVariantOverrides(overrides)) {
    throw new DocumentError(
      'schema',
      'The default variant is the base document and cannot contain overrides',
    );
  }
  if (!overrides) return;
  for (const node of Object.values(overrides.nodes ?? {})) {
    assertVariantUnsetPaths(variant.name, node);
    if (!node.displayOn) continue;
    const hasEquals = 'equals' in node.displayOn;
    const hasTruthy = 'truthy' in node.displayOn;
    if (hasEquals === hasTruthy) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" displayOn needs exactly one of equals or truthy`,
      );
    }
  }
  for (const insertion of overrides.insertions ?? []) {
    if (!insertion.node || typeof insertion.node !== 'object') {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" contains an invalid insertion node`,
      );
    }
  }
}

function hasVariantOverrides(overrides: VariantPreset['overrides']) {
  if (!overrides) return false;
  return (
    Boolean(overrides.fields && Object.keys(overrides.fields).length > 0) ||
    Boolean(overrides.styles && Object.keys(overrides.styles).length > 0) ||
    Boolean(overrides.unsetFields?.length) ||
    Boolean(overrides.nodes && Object.keys(overrides.nodes).length > 0) ||
    Boolean(overrides.removed?.length) ||
    Boolean(overrides.insertions?.length)
  );
}

function assertVariantUnsetPaths(
  variantName: string,
  node: NonNullable<NonNullable<VariantPreset['overrides']>['nodes']>[string],
) {
  const mapProperties = new Set([
    'attributes',
    'fields',
    'fieldBindings',
    'variants',
    'style',
    'childFields',
  ]);
  const scalarProperties = new Set([
    'text',
    'src',
    'alt',
    'repeat',
    'layout',
    'bindings',
    'eventBindings',
    'variantRules',
    'displayOn',
  ]);
  const configured = new Set(Object.keys(node).filter((key) => key !== 'unset'));
  for (const path of node.unset ?? []) {
    const [property, key, ...rest] = path.split('.');
    if (property === 'childFields') {
      if (!key || rest.length > 1) {
        if (!key && configured.has(property)) {
          throw new DocumentError(
            'schema',
            `Variant "${variantName}" cannot set and unset "${property}" together`,
          );
        }
        if (rest.length > 1) {
          throw new DocumentError(
            'schema',
            `Variant "${variantName}" has an invalid unset path "${path}"`,
          );
        }
      } else if (configured.has(property)) {
        const values = (node as Record<string, unknown>)[property];
        const pathValues =
          values && typeof values === 'object'
            ? (values as Record<string, unknown>)[key]
            : undefined;
        if (rest.length === 0 && pathValues !== undefined) {
          throw new DocumentError(
            'schema',
            `Variant "${variantName}" cannot set and unset "${path}" together`,
          );
        }
        const fieldName = rest[0];
        if (
          rest.length === 1 &&
          fieldName &&
          pathValues &&
          typeof pathValues === 'object' &&
          fieldName in (pathValues as object)
        ) {
          throw new DocumentError(
            'schema',
            `Variant "${variantName}" cannot set and unset "${path}" together`,
          );
        }
      }
      continue;
    }
    if (
      !property ||
      rest.length > 0 ||
      (!mapProperties.has(property) && !scalarProperties.has(property))
    ) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" has an invalid unset path "${path}"`,
      );
    }
    if (key && !mapProperties.has(property)) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot unset a nested property "${path}"`,
      );
    }
    if (!key && mapProperties.has(property) && configured.has(property)) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot set and unset "${property}" together`,
      );
    }
    if (!key && scalarProperties.has(property) && configured.has(property)) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot set and unset "${property}" together`,
      );
    }
    if (key && configured.has(property)) {
      const values = (node as Record<string, unknown>)[property];
      if (values && typeof values === 'object' && key in (values as object)) {
        throw new DocumentError(
          'schema',
          `Variant "${variantName}" cannot set and unset "${path}" together`,
        );
      }
    }
  }
}
