/** True when the event target is editing text, so shortcuts stay with the field. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof target !== 'object' || target === null) return false;
  if (!('nodeType' in target) || (target as Node).nodeType !== Node.ELEMENT_NODE) return false;
  const element = target as HTMLElement;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
}
