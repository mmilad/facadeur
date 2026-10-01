export function ownsComponentFeatures(kind: string): boolean {
  return kind === 'atom' || kind === 'component';
}
