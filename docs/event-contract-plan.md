# Event contracts

Status: implemented. Event contracts use the shared schema selector, typed native/context/literal
data mappings, and generated callback envelopes. Legacy payload declarations remain readable
through Core's normalization boundary; new editor changes use the data contract.

## Public callback contract

An event named `commit` derives an optional `onCommit` callback in the component's public
contract. Callback names and signatures are derived from events, rather than independently
authored function fields in the JSON data schema.

Generated React output owns the runtime envelope type:

```ts
export interface ComponentEvent<TData, TName extends string = string> {
  eventName: TName;
  event: Event;
  native: string;
  data: TData;
}

export interface InputCommitData {
  value: string;
}

export interface InputProps extends InputData {
  onCommit?: (event: ComponentEvent<InputCommitData, 'commit'>) => void;
}
```

`event` is the actual browser event. A React adapter forwards `reactEvent.nativeEvent`, not
the synthetic wrapper or a reconstructed event. This preserves the browser target and event
methods. Browser `currentTarget` is only meaningful during dispatch; deferred consumers should
capture needed element values immediately. Portable Core declarations do not import DOM or
React event types, and runtime events are never persisted as preview data or history.

`native` reports the actual browser event's `type`. The configured binding is separate:
React's `onChange` can originate from a browser `input` event, so the configured name must not
overwrite the observed native type.

## Event data declarations

Keep the existing persisted event `name` as its identity. Add `data` as a contract assignment
using the same schema references and named-field declarations as component contracts:

```json
{
  "name": "commit",
  "data": {
    "fields": [{ "name": "value", "type": { "kind": "type", "type": "string" } }]
  }
}
```

Alternatively:

```json
{
  "name": "commit",
  "data": { "direct": { "kind": "schema", "schemaId": "input-commit" } }
}
```

Support scalar, object and array contracts through the shared schema resolver. Exactly one
contract mode is active: one type or declared fields. An event without data still receives
the envelope, with `data: undefined`; no zero-argument callback exception. Named schemas are
generated in `types/`, with local event data types in the owning component's `types.ts`.

The data schema describes the payload shape. A node's event binding supplies the native
source and maps values into that shape. Selecting a schema alone does not produce values.
Support a source for the whole payload for scalar contracts and field paths for object
contracts. Reuse existing data-binding sources for component/repeater context and literals
where appropriate, alongside native sources such as `currentTarget.value`, `checked` and
`valueAsNumber`. Reject incompatible or missing required mappings rather than copying the
input value into every field. Nested objects/arrays need explicit typed mappings, not arbitrary
JavaScript expressions or inference from field names.

## Editor and public forwarding

Replace the compact `value:text` input with the existing contract interaction:
`Use one type` / `Declare fields`, the shared schema picker, and named field rows. A derived
public-contract preview displays `onCommit` and its envelope/data types. Native source and
data mappings stay in the node's event-binding control.

Events are exposed explicitly through instance paths. Wrappers preserve the original native
event, native type and data. If a public mapping renames an event, update `eventName` to the
wrapper's public name. Validate the forwarded data contract. Do not automatically expose all
descendant events or execute application callbacks in the editor.

## Form values

Authored initial form values generate React `defaultValue` / `defaultChecked`. No `useState`
belongs in the JSON schema. Emitting an event does not itself turn a field into a controlled
input. Explicit controlled-value support is a separate contract; do not infer state ownership
from the presence of a callback. Uncontrolled defaults initialize a mounted input and do not
continually synchronize later prop changes.

## Implementation order and boundaries

1. Extract the reusable contract-selection controls from `SchemaUseControl`: their value and
   schema-catalog inputs are shared; document commands, defaults and preview remain with the
   component schema surface. Evidence: the current event editor only parses a flat payload
   string, while the component editor already implements the requested modes. Keep this
   extraction in the editor's schema-control domain; do not introduce a generic utility package.
2. Extend Core event contracts/resolution and validation; migrate legacy `payload` declarations
   and bindings through a single normalization boundary. Preserve public exports, document
   loading, explicit event forwarding, Undo/Redo and retained adapter round trips. Avoid two
   independently authoritative event-data representations.
3. Update event editing and binding controls using the shared selector/resolver. Preserve
   existing component contract/default editing and preview behavior.
4. Generate shared envelope/local data types, native-event handlers and forwarding adapters.
   Emit no Facadeur runtime dependencies. Update examples, Storybook arguments and event docs
   for the new callback envelope; keep functions out of serializable story data.
5. Generate native form defaults and verify editable input, textarea, select and checkbox
   behavior without callbacks. Do not apply form-control rules to all atoms.

Validation: contract modes/reference resolution, legacy migration, missing/incompatible data
mappings, callback naming, native event identity/target, renamed forwarding, nested repeater
context, generated typechecks and callback runtime tests. Verify text editing with no handler
and event delivery with a handler. Finish with Core/editor/codegen/adapter checks, standalone
workspace regeneration/typecheck/build, editor interaction checks and the refactor detector.

Planning review: the affected existing event modules have no size candidates. Extraction is
justified by the actual shared contract-selection interaction, not file size. Implementation
must rerun the detector and inspect staging before edits.
