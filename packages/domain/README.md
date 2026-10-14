# @facadeur/domain

Shared **types and interfaces** only.

- No runtime logic, no side effects, no DOM, no I/O.
- No functions or classes that produce output — contracts for `@facadeur/core`, API, and the editor.
- Validation and controllers live in `@facadeur/core`; the Editor canvas renders with React.
