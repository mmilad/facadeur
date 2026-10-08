import type { DesignPropDefinition, ProjectCatalog } from '@facadeur/domain';

export function upsertCatalogDesignProp(
  catalog: ProjectCatalog,
  prop: DesignPropDefinition,
): ProjectCatalog {
  const next = structuredClone(catalog) as ProjectCatalog;
  next.props = { ...(next.props ?? {}), [prop.uuid]: prop };
  return next;
}

export function removeCatalogDesignProp(catalog: ProjectCatalog, uuid: string): ProjectCatalog {
  if (!catalog.props?.[uuid]) return catalog;
  const next = structuredClone(catalog) as ProjectCatalog;
  const { [uuid]: _removed, ...rest } = next.props ?? {};
  next.props = Object.keys(rest).length > 0 ? rest : undefined;
  return next;
}
