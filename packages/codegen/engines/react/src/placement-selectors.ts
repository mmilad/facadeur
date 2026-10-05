import type { DocumentFile } from '@facadeur/core';
import { instancePlacements } from './component/class-names';
import { CodegenError } from './names';

/** Follow instance boundaries, skipping transparent structural nodes in authored paths. */
export function placementSelector(
  scope: string,
  document: DocumentFile,
  path: string,
  catalog: ReadonlyMap<string, DocumentFile>,
  components: ReadonlyMap<string, string>,
) {
  let owner = document;
  const selectors: string[] = [];
  let sharesRoot = false;
  for (const id of path.split('/').filter(Boolean)) {
    const placement = instancePlacements(owner, components.get(owner.id)!).get(id);
    if (!placement) continue;
    if (!selectors.length) {
      sharesRoot =
        owner.root.type === 'repeater' || owner.root.type === 'switch' || owner.root.id === id;
    }
    selectors.push(`:global(.${placement.className})`);
    owner = catalog.get(placement.component) ?? owner;
  }
  if (!selectors.length)
    throw new CodegenError(`No instance placement found for "${document.id}/${path}"`);
  return `${scope}${sharesRoot ? '' : ' '}${selectors.join(' ')}`;
}
