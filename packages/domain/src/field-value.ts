export type FieldValue =
  | string
  | number
  | boolean
  | null
  | FieldValue[]
  | { readonly [key: string]: FieldValue };
