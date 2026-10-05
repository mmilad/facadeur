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

Public events declare their data contract with `data.direct` (one primitive or shared schema) or `data.fields` (named fields with primitive/shared-schema types). The Schema surface uses **Use one type / Declare fields** for both component properties and event data. Declared event fields are required; named schemas preserve their own required/optional fields. Callbacks derive from event names: `commit` generates `onCommit`, independently of the component data interface.

An element event binding identifies the public event with `event` and the trigger with `name`. Its `data` mappings select native values (`currentTarget.value`, `checked`, `valueAsNumber`), the current data context, or literals. An empty destination path supplies the whole payload; named paths supply fields or nested fields. Selecting a data schema does not automatically populate its fields. Legacy `payload` declarations and mappings remain readable through Core's shared resolver.

Generated callbacks receive `{ eventName, event, native, data }`. `event` is the original browser event (React forwards `nativeEvent`); `native` is its actual type, which can differ from the configured React trigger. For example, React `change` may wrap a native `input`. Native event objects stay out of saved documents and preview data. Capture any `currentTarget` values needed asynchronously during dispatch. Explicit public mappings forward the same browser event and data, changing the public `eventName` when renamed. The editor configures these contracts without executing application handlers.

Native form inputs generate `defaultValue` / `defaultChecked` for initial values, so they are editable without a state update callback. These defaults initialize a mounted control; they do not continually synchronize later prop changes. Emitting an event does not create application state or automatically make an input controlled.

The existing token, breakpoint, state, and child-style representations are unchanged. Preview metadata, display labels, conditional selection, and explicit payload sources are additive extensions rather than replacements for those representations.
