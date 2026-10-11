# Style engine

The package owns Catalog-backed design CSS generation. Its public entry point is `src/index.ts`;
other packages should import through `@facadeur/style-engine`.

`renderDesignCss` resolves UUID-keyed tokens, fonts, and responsive design values through Core
and returns stylesheet text. The Editor injects that output into its design preview. The package
does not compile legacy `DocumentFile` styles or maintain a separate document CSSOM controller.

```text
src/
  design/css.ts  token, font, and responsive CSS generation
  runtime/design.ts  private CSSStyleSheet insertion for resolved design styles
  index.ts  package exports
```

The test suite covers active Catalog-backed CSS output, including sparse breakpoint values,
font-face output, and project-template token values.
