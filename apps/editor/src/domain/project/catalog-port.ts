import type { CatalogDefinitionPort, CatalogPort } from '@facadeur/core';
import type { CatalogMapKey } from '@facadeur/domain';

export type CatalogDefinitionKind = CatalogMapKey;

/** Catalog persistence and definition operations supplied by the active editor host. */
export type EditorCatalogPort = CatalogPort & CatalogDefinitionPort;
