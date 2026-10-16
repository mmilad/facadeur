import type { JsonSchema } from '@facadeur/core';

export type SchemaRecursionEntry = {
  readonly uuid: string;
  readonly schema: JsonSchema;
};

export type SchemaRecursionWarning = {
  readonly id: string;
  readonly path: string;
};

type ReferenceEdge = {
  readonly from: string;
  readonly to: string;
  readonly path: string;
  readonly canTerminate: boolean;
};

const SCHEMA_REF_PREFIX = 'urn:facadeur:schema:';

/** Finds reachable reference cycles that have no recognized optional or array exit. */
export function schemaRecursionWarnings(
  schemas: readonly SchemaRecursionEntry[],
  selectedId: string,
): SchemaRecursionWarning[] {
  const schemasById = new Map(schemas.map((entry) => [entry.uuid, entry.schema]));
  if (!schemasById.has(selectedId)) return [];

  const edges = schemas.flatMap(({ uuid, schema }) => collectReferenceEdges(uuid, schema));
  const reachable = reachableSchemaIds(selectedId, edges);
  const forcedEdges = edges.filter((edge) => !edge.canTerminate && reachable.has(edge.from));
  const warnings = new Map<string, SchemaRecursionWarning>();

  for (const start of reachable) {
    const stack: ReferenceEdge[] = [];
    const active = new Map<string, number>();
    const visited = new Set<string>();
    const visit = (id: string): void => {
      if (active.has(id)) {
        const cycle = stack.slice(active.get(id));
        if (!cycle.length) return;
        const cycleIds = cycle.map((edge) => edge.from);
        const key = canonicalCycleKey(cycleIds);
        const path = [...cycle.map((edge) => edge.path), cycle[0]!.from]
          .map((entry) => schemaLabel(entry, schemasById))
          .join(' → ');
        warnings.set(key, { id: key, path });
        return;
      }
      if (visited.has(id)) return;
      active.set(id, stack.length);
      for (const edge of forcedEdges.filter((candidate) => candidate.from === id)) {
        stack.push(edge);
        visit(edge.to);
        stack.pop();
      }
      active.delete(id);
      visited.add(id);
    };
    visit(start);
  }

  return [...warnings.values()];
}

function collectReferenceEdges(ownerId: string, schema: JsonSchema): ReferenceEdge[] {
  const output: ReferenceEdge[] = [];
  const ownerLabel = schemaLabel(ownerId, new Map([[ownerId, schema]]));

  const visit = (value: unknown, path: string, canTerminate: boolean): void => {
    if (!isRecord(value)) return;
    const reference = value.$ref;
    if (typeof reference === 'string' && reference.startsWith(SCHEMA_REF_PREFIX)) {
      const target = reference.slice(SCHEMA_REF_PREFIX.length);
      if (target) output.push({ from: ownerId, to: target, path, canTerminate });
    }

    const required = new Set(Array.isArray(value.required) ? value.required : []);
    if (isRecord(value.properties)) {
      for (const [name, child] of Object.entries(value.properties)) {
        visit(child, `${path}.${name}`, canTerminate || !required.has(name));
      }
    }
    const items = value.items;
    if (isRecord(items)) visit(items, `${path}[]`, true);
    else if (Array.isArray(items)) {
      items.forEach((item, index) => visit(item, `${path}[${index}]`, true));
    }
    for (const keyword of ['oneOf', 'anyOf'] as const) {
      const branches = value[keyword];
      if (!Array.isArray(branches)) continue;
      const hasReferenceFreeAlternative =
        branches.length > 1 && branches.some((branch) => !containsSchemaReference(branch));
      branches.forEach((branch, index) => {
        visit(branch, `${path}.${keyword}[${index}]`, canTerminate || hasReferenceFreeAlternative);
      });
    }
    const allOf = value.allOf;
    if (Array.isArray(allOf)) {
      allOf.forEach((branch, index) => visit(branch, `${path}.allOf[${index}]`, canTerminate));
    }
    if (isRecord(value.additionalProperties)) {
      visit(value.additionalProperties, `${path}.*`, true);
    }
    if (isRecord(value.patternProperties)) {
      for (const [pattern, child] of Object.entries(value.patternProperties)) {
        visit(child, `${path}[${pattern}]`, true);
      }
    }
  };

  visit(schema, ownerLabel, false);
  return output;
}

function containsSchemaReference(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSchemaReference);
  if (!isRecord(value)) return false;
  if (typeof value.$ref === 'string' && value.$ref.startsWith(SCHEMA_REF_PREFIX)) return true;
  return Object.values(value).some(containsSchemaReference);
}

function reachableSchemaIds(start: string, edges: readonly ReferenceEdge[]) {
  const reachable = new Set<string>();
  const pending = [start];
  while (pending.length) {
    const current = pending.pop()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const edge of edges) {
      if (edge.from === current && !reachable.has(edge.to)) pending.push(edge.to);
    }
  }
  return reachable;
}

function canonicalCycleKey(ids: readonly string[]) {
  const rotations = ids.map((_, index) => [...ids.slice(index), ...ids.slice(0, index)].join('→'));
  return rotations.sort()[0] ?? '';
}

function schemaLabel(id: string, schemas: ReadonlyMap<string, JsonSchema>) {
  const schema = schemas.get(id);
  return typeof schema?.title === 'string' && schema.title.trim() ? schema.title.trim() : id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
