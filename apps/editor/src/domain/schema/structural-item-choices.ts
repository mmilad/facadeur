import {
  structuralChildSchemas,
  type ContractResolverInput,
  type FieldDefinition,
  type FlatDocument,
  type JsonSchema,
} from '@facadeur/core';

/** Item choices follow configured templates, including forwarded component contracts. */
export function structuralItemChoices(
  document: FlatDocument,
  field: FieldDefinition,
  documents: ReadonlyMap<string, FlatDocument>,
  context: ContractResolverInput,
) {
  const choices: Array<{
    id: string;
    label: string;
    schema: JsonSchema;
    caseValue?: string;
    payloadSchema?: JsonSchema;
  }> = [];
  const visited = new Set<string>();
  const contractSchema =
    field.name === 'props' ? field.schema : (field.schema?.items ?? field.items?.schema);
  const branches =
    contractSchema?.anyOf ?? contractSchema?.oneOf ?? (contractSchema ? [contractSchema] : []);
  const branchKeys = new Set(branches.map((schema) => JSON.stringify(schema)));
  function visitOwner(owner: FlatDocument) {
    if (visited.has(owner.id)) return;
    visited.add(owner.id);
    function visitNode(id: string) {
      const node = owner.nodes[id];
      if (!node) return;
      if (node.type === 'repeater' || node.type === 'switch') {
        for (const candidate of structuralChildSchemas(owner, id, context)) {
          if (!branchKeys.has(JSON.stringify(candidate.schema))) continue;
          const target = documents.get(candidate.node.component);
          const caseValue = candidate.caseValue;
          const payloadSchema = candidate.payloadSchema;
          const id = candidate.path.join('/');
          if (choices.some((choice) => choice.id === id)) continue;
          const matchingCaseCount = choices.filter(
            (choice) => choice.label === (target?.name ?? candidate.node.component),
          ).length;
          choices.push({
            id,
            label:
              matchingCaseCount > 0 && caseValue
                ? `${target?.name ?? candidate.node.component} (${caseValue})`
                : (target?.name ?? candidate.node.component),
            schema: candidate.schema,
            ...(caseValue ? { caseValue } : {}),
            ...(payloadSchema ? { payloadSchema } : {}),
          });
        }
        return;
      }
      if (node.type === 'instance') {
        if (node.forwardFields === false) return;
        const target = documents.get(node.component);
        if (target) visitOwner(target);
      } else if (node.type === 'frame') {
        for (const child of node.children) visitNode(child);
      }
    }
    visitNode(owner.rootId);
  }
  visitOwner(document);
  if (choices.length) return choices;
  // Authored array contracts can provide forms without a structural template.
  return branches
    .filter((schema) => Object.keys(schema).length > 0)
    .map((schema, index) => ({
      id: `schema-${index}`,
      label: typeof schema.title === 'string' ? schema.title : `Item ${index + 1}`,
      schema,
      ...schemaCaseContract(schema),
    }));
}

function schemaCaseContract(schema: JsonSchema) {
  const properties = schema.properties;
  const caseValue = properties?.type?.const;
  const payloadSchema = properties?.props;
  return {
    ...(typeof caseValue === 'string' ? { caseValue } : {}),
    ...(payloadSchema ? { payloadSchema } : {}),
  };
}
