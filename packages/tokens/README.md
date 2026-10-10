# `@facadeur/tokens` (deprecated)

This package is a compatibility facade for existing catalog validation and persistence callers.
It contains no token-resolution, fixture, or stylesheet implementation.

- Import token resolution, responsive breakpoints, and token CSS property names from
  `@facadeur/core`.
- Import stylesheet compilation from `@facadeur/style-engine`.
- Import starter project templates and token fixtures from `@facadeur/examples`.

Keep these forwarding exports until API and Store Yjs callers can migrate in a separately scoped
change. Do not add new consumers to this package.
