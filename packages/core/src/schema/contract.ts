/** JSON Schema contract used by Catalog node definitions. */
export interface JsonSchema {
  $ref?: string;
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  default?: unknown;
  additionalProperties?: boolean | JsonSchema;
  [keyword: string]: unknown;
}
