# Editor form kit (v1)

Reusable controlled form primitives for editor chrome (inspector, sidebars, popovers). Lives under `packages/editor/src/ui/form/`.

## Folder map

| Path                    | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `types/`                | `FormChangeMeta`, density, option types                        |
| `schema/`               | `getPath` / `setPath`, declarative `FieldConfig`, `SchemaForm` |
| `const/`                | Density defaults and gap tokens                                |
| `components/layout/`    | `Stack`, `Inline`, `Grid`, `Section`, `Divider`                |
| `components/input/`     | Text, number, search, **ColorInput**                           |
| `components/selection/` | Select, Combobox, segmented, checkbox, toggle, radio           |
| `components/feedback/`  | `Field`, `InlineError`, `HelpHint`                             |
| `components/overlay/`   | `Popover`, `Modal`, `AddPopover` (Radix Popover + Dialog only) |
| `components/dynamic/`   | `ArrayField`, `RecordField`                                    |
| `Form.tsx`              | Root controlled form                                           |
| `index.ts`              | Public exports                                                 |

Dev demo: run `pnpm --filter @facadeur/editor dev` and open `/form-demo.html`.

## Form change API

```ts
type FormChangeMeta = {
  path: string; // e.g. "label", "tags.0.name", "declarations.padding"
  previous: unknown;
  next: unknown;
};

<Form
  value={state}
  onChange={(next, meta) => setState(next)}
  onCommit={(next, meta) => issueUndoCommand(next, meta)}
/>
```

### Path rules

- Dot segments; array indices are numeric (`items.0.name`).
- Record keys that contain `.` use bracket segments: `declarations["padding.top"]`.
- Helpers: `getPath`, `setPath`, `formatKey`, `resolvePath` (see `schema/path.ts`).

### `onChange` vs `onCommit`

| Control                                              | `onChange`                 | `onCommit` (when provided)            |
| ---------------------------------------------------- | -------------------------- | ------------------------------------- |
| Text, textarea, number, search, color                | Each keystroke / live drag | Blur or Enter                         |
| Toggle, checkbox, select, combobox, segmented, radio | Immediate                  | Immediate (one click = one undo step) |
| Array / record + / ×                                 | Immediate                  | Immediate                             |

Primitives accept standalone `value` / `onChange` props, or a `name` when nested inside `<Form>`.

## Dynamic groups

### ArrayField

```tsx
<ArrayField name="tags" defaultItem={() => ({ name: '' })}>
  {(_, index) => (
    <Field label={`Tag ${index + 1}`}>
      <TextInput name="name" />
    </Field>
  )}
</ArrayField>
```

Built-in **+** (append `defaultItem`) and **×** (remove row). Paths look like `tags.0.name`.

### RecordField

`Record<string, string>` editor for CSS-like maps. **+** adds a row; committing a non-empty key writes into the record. **×** removes a key.

## ColorInput

- **Public value:** normalized `#RRGGBBAA` (uppercase hex; alpha `FF` when opaque).
- Popover: hex field, RGB channels (0–255), alpha **0–1**, native swatch, eyedropper when `window.EyeDropper` exists (hidden/disabled otherwise).
- Utilities: `normalizeColor`, `hexToRgba`, `rgbaToHex`.

## Styling

`form.css` defines editor-ui tokens (`--eu-bg`, `--eu-border`, `--eu-accent`, density gaps, focus ring). These are **chrome-only** and separate from design tokens rendered in document iframes.

## Future `ui/controls/*`

Domain controls (layout, font, shadow, tokens) should compose these primitives and `Form` / `SchemaForm`, not reimplement inputs. Keep document commands in panel code; pass `onCommit` from the panel when a change should create an undo step.

See [`docs/editor-controls.yaml`](./editor-controls.yaml) for the control matrix and data-flow contract (read `EditorSnapshot`, write via `session.execute` / `executeDesign`, catalogs as props — no store inside controls).
