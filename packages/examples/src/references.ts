/** Example fixtures keep property references readable and tie them to schema IDs. */
export function componentPropRef(uuid: string): string {
  return `{props:${uuid}}`;
}
