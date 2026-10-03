import { cssString } from '../css/strings';

/** Exact instance-root addressing, shared by direct and nested owner overrides. */
export function instanceTargetSelector(
  documentId: string,
  targetPath: string,
  componentId: string,
  address: 'instance' | 'canvas',
  canvasPath = targetPath,
): string {
  const segments = targetPath.split('/');
  // Repeated component markers preserve the existing override specificity.
  const component = `[data-component="${cssString(componentId)}"]`;
  const terminal = `[data-node="${cssString(segments.at(-1) ?? '')}"]${component}${component}`;
  if (address === 'canvas') return `[data-id="${cssString(canvasPath)}"]${terminal}`;
  const chain = segments
    .map((id, index) =>
      index === segments.length - 1 ? terminal : `[data-node="${cssString(id)}"]`,
    )
    .join(' > ');
  return `[data-component="${cssString(documentId)}"] > ${chain}`;
}
