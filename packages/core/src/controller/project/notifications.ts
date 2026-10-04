/** Deliver committed changes independently; observers cannot fail a committed operation. */
export function notifyListeners<T>(listeners: ReadonlySet<(change: T) => void>, change: T) {
  for (const listener of [...listeners]) {
    try {
      listener(structuredClone(change));
    } catch (error) {
      console.error('Project change listener failed', error);
    }
  }
}
