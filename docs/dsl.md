# Catalog data model

Facadeur's editor and Storybook work with a `ProjectCatalog`. The shared contracts are defined
in `@facadeur/domain`; validation, editing, and project coordination are owned by `@facadeur/core`.
Reusable catalog and design fixtures live in `@facadeur/examples`.

The current JSON Schema is generated to [`schema/catalog.schema.json`](../schema/catalog.schema.json)
with `pnpm schema`. For representative complete data, use `createExampleCatalog()` from
`@facadeur/examples` instead of inventing fixture records.

## Project catalog

A catalog has maps for atoms, components, and pages. Map keys are stable UUIDs and match each
definition's `uuid`. Schemas, design tokens, icons, semantic props, and global styles are optional
project-wide resources.

```ts
interface ProjectCatalog {
  atoms: Record<Uuid, NodeDefinition>;
  components: Record<Uuid, NodeDefinition>;
  pages: Record<Uuid, NodeDefinition>;
  schemas?: Record<Uuid, JsonSchemaObject>;
  tokens?: DesignTokenSet;
  icons?: IconDefinition[];
  props?: Record<Uuid, DesignPropDefinition>;
  globalStyles?: GlobalStyles;
}
```

An atom, component, or page definition contains a UUID, a name, a kind, a schema source, a root
node, and optional configuration or a style reference. A schema source either references a schema
in the catalog's `schemas` map or contains an inline JSON Schema object. The kind determines where
the definition appears in the catalog and how it is used by the editor and generator.

## Nodes

Nodes form a nested tree under each definition's `root`. Each node has a stable UUID and a DOM
specification with a tag name. A node can also have an editor-facing name, child nodes, style
declarations, schema, field data, or configuration. DOM text, attributes, properties, data, and
events are represented in their corresponding `dom` fields.

```json
{
  "uuid": "d62e95c2-8f16-41b7-8b41-ff49a1c17361",
  "name": "Heading",
  "dom": {
    "tagName": "h1",
    "text": "A catalog node",
    "attributes": { "class": "heading" },
    "children": []
  },
  "style": { "font-size": "{token:TOKEN_UUID}" }
}
```

The example illustrates the node shape; use real UUIDs and fields validated by the catalog schema.
Node-specific capabilities are expressed through the domain contracts in `packages/domain/src`
and the Core schemas, rather than a second document envelope.

## Design tokens and responsive values

The optional `tokens` set contains UUID-keyed maps for `color`, `space`, `radius`, `shadow`, `type`,
and `font`. A token record has a stable UUID, editable label and group, value type, and value.
References in styles use `{token:uuid}` so changing a token's label or group does not break its
consumers. Token operations and reference resolution belong to Core.

Project-wide responsive breakpoints live in `globalStyles.breakpoints`. Responsive style layers
are keyed by breakpoint UUID. The first configured breakpoint is the base viewport; later layers
override it at their configured minimum widths. The settings UI edits these shared project values.

## Editing and ownership

Editor changes go through the Core project controller, which owns catalog state and mutations.
Editor controls may present or adapt those operations, but should not duplicate catalog validation,
token resolution, or node-editing rules. Storybook and tests should reuse the fixtures from
`@facadeur/examples`.

For current generated output and command options, see the [Codegen guide](../packages/codegen/README.md).
