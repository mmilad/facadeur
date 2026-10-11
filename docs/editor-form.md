# Editor form integration

Reusable form elements belong to `@facadeur/form`. Editor code may wrap those elements to bind
catalog paths, supply prop/token options, and connect live changes and commits to the editor
session. It must not implement replacement native inputs.

## Current ownership

- `packages/form/src/fields/`: reusable controls, including text, textarea, number, search, color,
  select, autocomplete, radio, boolean, chips, record, repeater, and transformable fields.
- `apps/editor/src/ui/controls/form-binding/`: editor integration that binds package fields to
  catalog paths and editor session changes. It also contains recursive schema array composition.
- `apps/editor/src/ui/controls/data/schema-form/`: editor schema-to-control translation and field
  configuration, composed from package form fields and editor binding adapters.
- `apps/editor/src/ui/components/IconButton.tsx`: shared editor button primitive used by controls,
  design settings, token editing, and inspectors.

## Form change contract

The editor form context resolves dotted paths and array indices, then sends value updates through
`emitChange`. A live edit updates the draft; a commit marks a user action for editor undo/history.
Adapters must preserve both callbacks, disabled/error state, accessible labels, stable references,
and existing keyboard behavior.

Catalog paths, schema field configuration, prop bindings, token choices, and session writes remain
editor-owned. Generic field behavior and native input rendering remain package-owned. Use only the
package public API from outside `packages/form`.

## Verification and migration

The root Vitest configuration includes the active current-model Editor suites, including the
integration and color tests under `apps/editor/test/form`. Other legacy suites remain outside the
allowlist while they are migrated individually from removed flat `DocumentFile` fixtures; do not
add adapters. Presentation primitives live under `apps/editor/src/ui/components`, and token search
lives with the token UI. The active checklist and remaining ownership work are in
[the repository plan](plan.md#editor-form-ownership-cleanup).
