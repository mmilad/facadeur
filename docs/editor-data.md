# Schema, preview data, and variants

The editor subnavigation separates these tasks:

- **Editor**: structure, style, instance values/bindings, render conditions, and conditional variant selection. Element and event bindings for a layer are edited on the selected layer in Editor (Content).
- **Schemas**: a project library of reusable JSON Schemas. A component chooses one of these schemas. This library is separate from the document field list. Built-in contracts live in `examples/schemas.json` (Input, Textarea, Image, Video, Card, and Media). The editor can describe objects, arrays, string enums, and composition: `oneOf` is a union, `anyOf` matches any listed shape, and `allOf` matches every listed shape. Media is a `oneOf` union of image and video. Browser edits override that file for the edited id.
- **Schema**: the open document's props, event payloads, and public mappings, plus the chosen library schema. Legacy variant axes remain available in a disclosure.
- **Code**: read-only React output for the open component.
- **Preview data**: example values used by the editor, with sparse overrides for each named variant.

Required props describe the runtime contract; they do not require a preview value. Missing required samples are indicated in Preview data. Sample values never become React prop defaults. Generated Storybook default-story args may use the base samples.

## Additive document metadata

`previewData.fields` stores base samples. `previewData.variants[presetId]` stores only that variant's sample overrides. Clearing an override restores inheritance from the base. The renderer injects these samples into an ephemeral document; the saved schema remains separate.

`variantLabels` maps stable preset IDs to editable display names, including `default`. Renaming a display label does not change references or the generated variant union. Creating the first variant exposes the existing base as **Default**; both names are editable. Named variants retain the same schema and store sparse tree/style overrides through the existing preset commands.

Existing top-level field defaults and preset field values are migrated to preview metadata when a document is loaded into the editor. Loading establishes a clean save baseline. The next save persists the migrated shape. Legacy `unsetFields` is retained to avoid losing old preview behavior. Unmigrated documents still retain the generator's previous default behavior for compatibility.

## Conditions and events

Instance `variantRules` is an ordered array of `{ when, variant }`, using the existing `displayOn` condition format. The first matching rule selects the variant; no match falls back to Default. An explicit `instance.variants.variant` takes priority, including an explicit `default`. Rules are preserved by flattening, Yjs, sparse presets, DOM rendering, and React generation.

An element event binding still identifies the public event with `event` and the native trigger with `name`. Optional `payload` maps public payload keys to `value`, `checked`, or `valueAsNumber`. Sources are checked against the payload types; omitted mappings retain the existing type-based behavior. Emitting an event does not create local state.

The existing token, breakpoint, state, and child-style representations are unchanged. Preview metadata, display labels, conditional selection, and explicit payload sources are additive extensions rather than replacements for those representations.
