# @facadeur/domain

Shared **types, enums, and interfaces** only.

- No runtime logic, no side effects, no DOM, no I/O.
- No functions or classes that produce output — contracts for `@facadeur/core`, `@facadeur/renderer-dom`, API, and the editor.
- Validation and controllers live in `@facadeur/core`; rendering lives in `@facadeur/renderer-dom`.
