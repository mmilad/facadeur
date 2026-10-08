# Storybook schema form panel

This Storybook manager panel renders controls from serializable field definitions supplied by a
story. It has no dependency on Facadeur or a particular catalog model. Fields write their values
to story args, so the story can render the selected state.

## Register the panel

Import `registerSchemaFormPanel` from this folder in the Storybook manager entry:

```ts
registerSchemaFormPanel({
  addonId: 'example/schema-form',
  panelId: 'example/schema-form/panel',
  title: 'Story controls',
});
```

## Configure a story

Pass field definitions through the `storybookSchemaForm` parameter. Select fields can derive
their options from another arg; changing that arg resets the dependent field to its first valid
option. Repeater fields describe their item controls and the default object to add.

```ts
parameters: {
  [STORYBOOK_SCHEMA_FORM_PARAMETER]: {
    fields: [
      { type: 'text', name: 'title', label: 'Title' },
      {
        type: 'select',
        name: 'layerId',
        label: 'Layer',
        optionsFrom: { arg: 'assetId', values: layersByAsset },
      },
      {
        type: 'repeater',
        name: 'items',
        label: 'Items',
        itemLabel: 'Item',
        itemFields: [{ type: 'text', name: 'label', label: 'Label' }],
        createItem: { label: 'New item' },
      },
    ],
  },
},
```

Declare matching story args and consume them in the story render function. Hide those args from
the built-in Controls panel with `control: false` when this panel should be their only editor.
