import { createRequire } from 'node:module';
import { posix } from 'node:path';
import * as ts from 'typescript';

const reactRequire = createRequire(
  new URL('../../../../../apps/storybook/package.json', import.meta.url),
);

/** Execute generated modules with React, CSS modules and relative imports only. */
export function generatedRuntime(files: readonly { path: string; contents: string }[]) {
  const sources = new Map(files.map((file) => [file.path, file.contents]));
  const cache = new Map<string, Record<string, unknown>>();
  function load(path: string): Record<string, unknown> {
    const key = [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`].find((candidate) =>
      sources.has(candidate),
    );
    if (!key) throw new Error(`Missing generated module ${path}`);
    const prior = cache.get(key);
    if (prior) return prior;
    const module = { exports: {} as Record<string, unknown> };
    cache.set(key, module.exports);
    const localRequire = (specifier: string) => {
      if (specifier === 'react' || specifier === 'react/jsx-runtime')
        return reactRequire(specifier);
      if (specifier === '@facadeur/ui') return load('index.ts');
      if (!specifier.startsWith('.')) throw new Error(`Unexpected runtime dependency ${specifier}`);
      const target = posix.normalize(`${posix.dirname(key)}/${specifier}`);
      if (target.endsWith('.css')) {
        return Object.fromEntries(
          [...(sources.get(target) ?? '').matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => [
            match[1],
            match[1],
          ]),
        );
      }
      return load(target);
    };
    const compiled = ts.transpileModule(sources.get(key)!, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    new Function('require', 'module', 'exports', compiled.outputText)(
      localRequire,
      module,
      module.exports,
    );
    return module.exports;
  }
  return { load, react: reactRequire('react'), server: reactRequire('react-dom/server') };
}
