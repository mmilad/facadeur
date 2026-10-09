import type { DesignPropDefinition, ProjectCatalog } from '@facadeur/domain';

export function upsertCatalogDesignProp(
  catalog: ProjectCatalog,
  prop: DesignPropDefinition,
): ProjectCatalog {
  return {
    ...catalog,
    props: { ...(catalog.props ?? {}), [prop.uuid]: prop },
  };
}

export function removeCatalogDesignProp(catalog: ProjectCatalog, uuid: string): ProjectCatalog {
  if (!catalog.props?.[uuid]) return catalog;
  const { [uuid]: _removed, ...props } = catalog.props ?? {};
  return {
    ...catalog,
    props: Object.keys(props).length > 0 ? props : undefined,
  };
}
