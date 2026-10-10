# Tooling friction backlog

## Resolved: Storybook build needs host filesystem access

- **Reproduction:** Run `apps/editor/node_modules/.bin/storybook.CMD build --config-dir .storybook --output-dir storybook-static` from `apps/editor` in the restricted process.
- **Evidence/impact:** Vite/SWC fails with `EPERM` while canonicalizing the Next.js path under `node_modules/.pnpm/next@.../node_modules/next/dist/compiled/react/index.js` or the editor `baseUrl`. The same command succeeds in the approved host context and completes the production build.
- **Workaround:** Run the Storybook build in the approved host context; no dependency or config change is needed.
- **Status (2026-10-09):** Confirmed with a successful Storybook 10.6.1 production build.
- **Restricted-process recurrence (2026-10-09):** Running `storybook dev -p 6006` or `storybook build` through the local CLI builds the manager, then SWC panics with `EPERM` while canonicalizing `apps/editor` as `jsc.baseUrl`. Preview verification still requires the user's host pnpm environment.
- **Update (2026-10-09):** `pnpm --filter @facadeur/editor exec storybook dev -p 6007` first attempts to download the pinned pnpm 10.33.3 through Corepack and fails with `ENOTFOUND registry.npmjs.org`. Invoking `apps/editor/node_modules/.bin/storybook.cmd dev -p 6007` bypasses that lookup but reaches the same SWC `EPERM` while canonicalizing `.` as `jsc.baseUrl`; the current browser tab did not reload the edited source. Use the user's host Storybook process for current-source visual verification.

## Test runner blocked by filesystem sandbox

- **Reproduction:** Run `pnpm exec vitest run apps/editor/test/schema-library.test.ts apps/editor/test/schema-composition-ui.test.tsx` in the restricted workspace process.
- **Evidence:** pnpm 10.33.3 is available locally. Inside the filesystem sandbox, pnpm/Vitest fail with `EPERM` when `fs.promises.realpath` resolves `D:\newProjects\facadeur\apps\editor`. The same focused command succeeds outside the sandbox (13 tests passed).
- **Impact:** Focused tests require running outside the sandbox; normal in-sandbox verification is blocked.
- **Update (2026-10-10, spacing settings):** `pnpm --filter @facadeur/editor typecheck` was blocked before TypeScript ran with `EPERM` from `realpath` on `D:\newProjects\facadeur\apps\editor`. This prevents authoritative editor typecheck in the restricted process; run the same command in the user's CMD environment.
- **Workaround:** Run the same command with the approved outside-sandbox execution. Confirmed with the regular `pnpm` shim, which reports 10.33.3; this is not a package-version mismatch.
- **Next step:** Diagnose why pnpm startup hangs in the sandbox after repository read access is added. If it persists, collect a fresh Windows sandbox log; until then, the approved outside-sandbox run is reliable.
- **Update (2026-10-09, catalog exposure):** Directly invoking `node node_modules/vitest/vitest.mjs run packages/core/test/catalog-field-exposure.test.ts` also fails twice before collecting tests. Vite reports `EPERM` from `fs.realpath` on `node_modules/.pnpm/vitest@.../dist/spy.js`; the focused exposure suite therefore cannot run in this restricted process. The typecheck fallback still reaches source and reports only the existing unrelated workspace errors after the exposure diagnostics were fixed.

- **Update (2026-10-03):** After `/sandbox-add-read-dir D:\newProjects\facadeur`, `node --version` works in the sandbox, but `pnpm --version` and the focused Vitest command stay silent for more than 10 seconds and must be interrupted. The focused command still passes outside the sandbox (13 tests). Repository read access alone has not resolved this friction; diagnose the pnpm startup hang and collect a fresh Windows sandbox log if it persists.
- **Update (2026-10-03):** Directly invoking `node node_modules/vitest/vitest.mjs run apps/editor/test/automatic-field-forwarding-ui.test.tsx apps/editor/test/component-contract.test.ts` starts immediately but Vitest then fails resolving `node_modules/.pnpm/.../vitest/dist/spy.js` with `EPERM` from `fs.realpath`. This reproduces the same sandbox boundary at the pnpm virtual store, even when bypassing pnpm startup. The focused checks need the approved outside-sandbox run until that path resolution issue is fixed.
- **Update (2026-10-04):** The same `EPERM` realpath failure recurred when running five focused schema tests through the direct Vitest CLI. The identical command then started outside the sandbox; this time it exposed an actual fixture mismatch (`Preview refers to unknown field "value"`), which was corrected by making the fixture schema declare that field.
- **Update (2026-10-04):** During Core ownership cleanup, `pnpm.cmd --version` again stayed silent beyond 10 seconds. Bypassing pnpm and invoking `node_modules/.bin/vitest.cmd run packages/core/test` (also with one worker for `model.test.ts`) reproducibly fails before collecting tests with `EPERM: operation not permitted, realpath` for `node_modules/.pnpm/.../vitest/dist/spy.js`; the matching Core typecheck and ESLint commands do run. This leaves the latest sandboxed test result unavailable; rerun Core tests in the matching pnpm environment outside the sandbox.
- **Update (2026-10-04, controller migration):** `pnpm --filter @facadeur/core typecheck` and `pnpm exec vitest run packages/core/test` again stayed silent for over a minute. Direct `node node_modules/typescript/bin/tsc --noEmit -p packages/core/tsconfig.json` works in the sandbox; approved `node node_modules/vitest/vitest.mjs run packages/core/test` outside it passes all 132 existing Core tests. This restores task verification; the pnpm sandbox startup issue remains open.
- **Update (2026-10-04, style controller):** `node node_modules/vitest/vitest.mjs run packages/core/test` again fails inside the sandbox before collecting tests with `EPERM` resolving Vitest's `dist/spy.js`. The identical approved outside-sandbox command passes all 135 Core tests; regular `pnpm -r --if-present typecheck` also passes outside the sandbox. The existing workaround remains required.

## Project-pinned pnpm cannot be fetched in the sandbox

- **Update (2026-10-04, hydration debugging):** `pnpm exec prettier --write <affected editor files>` stays silent and eventually reports `GET https://registry.npmjs.org/pnpm: fetch failed` in the sandbox. The direct local invocation `node node_modules/prettier/bin/prettier.cjs --write <affected editor files>` succeeds without network access. Use the installed CLI for formatting; fix the pnpm shim's version lookup to use the locally installed pinned version offline.

- **Update (2026-10-04, project-controller adoption):** Direct `node node_modules/typescript/bin/tsc --noEmit -p apps/editor/tsconfig.json` in the restricted process reports incomplete dependency typings (Yjs `Doc.on`/`destroy`, React/Radix props, and testing-library exports). The regular approved `pnpm -r --if-present typecheck` outside the sandbox passes. The exact dependency-resolution cause remains unconfirmed; use the regular workspace command in the matching environment rather than changing dependencies to satisfy these restricted-process diagnostics.

- **Reproduction:** Run `pnpm --filter @facadeur/core typecheck` in the restricted workspace process.
- **Evidence:** The sandbox resolves `pnpm` to `C:\Program Files\nodejs\pnpm.ps1`; invoking it attempts `GET https://registry.npmjs.org/pnpm` because the project pins `pnpm@10.33.3`. Network access is unavailable, so the command hangs until interrupted and reports `fetch failed`. The Codex fallback pnpm is 11.19.0, which does not match the project pin.
- **Impact:** Package typechecks and tests cannot start reliably from this process, so current validation is blocked before reaching project code.
- **Fix:** Make the already-installed pnpm 10.33.3 executable available to the sandbox process, or run verification with the user's matching pnpm environment outside the restricted process. Do not change the project pin just to bypass sandbox PATH mismatch.
- **Update (2026-10-09, inspector boundary):** `pnpm --filter @facadeur/core typecheck` and `pnpm --filter @facadeur/editor typecheck` both stop before reaching project code while Corepack tries to fetch the pinned pnpm 10.33.3 from `registry.npmjs.org` (`ENOTFOUND`). Direct local TypeScript invocations start but report the already-known workspace source/dependency-link errors; they report no diagnostics in the new inspector modules. The pinned pnpm lookup remains the blocker for authoritative workspace typechecks.
- **Update (2026-10-09, form inputs):** Both filtered pnpm typecheck commands again stop at Corepack's attempt to fetch pnpm 10.33.3 (`getaddrinfo ENOTFOUND registry.npmjs.org`). Direct package TypeScript succeeds for `packages/form`; the editor TypeScript run reports the known workspace errors and no diagnostics in changed form/token files. The network/DNS cause and local-binary workaround remain unchanged.
- **Update (2026-10-10, Shadow settings):** `pnpm --filter @facadeur/editor typecheck` again stops before TypeScript starts: this process has no cached pnpm 10.33.3, and Corepack cannot resolve `registry.npmjs.org` (`ENOTFOUND`). Authoritative Editor typecheck needs to run from the user's CMD environment with the already-installed project-pinned pnpm.
- **Update (2026-10-04, structural renderer):** `pnpm exec vitest run packages/renderer-dom/test/render.test.ts` stayed silent for over 30 seconds in the restricted process and had to be interrupted. The focused test run therefore needs the documented matching pnpm environment outside the sandbox; no test runner output was produced before interruption.

## Browser automation setup fails

- **Reproduction:** Call `cua.getState()` through `mcp__cua_repl.js` to inspect the running editor window.
- **Evidence:** The CUA kernel exits before returning app/window state with `windows sandbox failed: helper_unknown_error: setup refresh had errors`. Resetting the CUA runtime does not resolve it. This has also prevented visual checks in earlier editor work.
- **Impact:** UI changes can be compiled and tested, but cannot be visually verified through the current Windows browser automation session.
- **Fix:** Restart Codex and retry the native sandbox setup, then collect a fresh Windows sandbox log if it persists. The current user config already selects the recommended `elevated` mode; the repo cannot repair the CUA helper itself.
- **Update (2026-10-05):** The DOM-capable in-app browser works for the isolated structural-node preview. Browser interaction and screenshots are verified through CUA; the earlier native-helper limitation no longer blocks this task.

## Workspace link update requests reinstall without a terminal

- **Reproduction:** `pnpm install --offline --ignore-scripts` after adding an existing workspace dependency to `packages/ui`.
- **Evidence:** pnpm 10.33.3 aborts with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` before changing the installation; it requests purging the current modules directory. The precise reason it requires reinstalling the supplied dependency layout remains unconfirmed.
- **Impact:** Updating a workspace link through the full install would interrupt a running preview and cannot proceed unattended in this environment.
- **Workaround:** `pnpm install --lockfile-only --offline --ignore-scripts`, retain only the intended importer change, and create the missing local workspace junction without replacing node_modules. The isolated preview can keep running.
- **Fix:** Align the supplied modules layout and package-manager configuration with pnpm 10.33.3 so workspace link updates do not request a purge; verify an offline full install in a disposable checkout before changing the live dependency installation.

- **Update (2026-10-06):** The same no-TTY purge request recurred after removing generated workspace packages. `pnpm install --frozen-lockfile --ignore-scripts --config.confirmModulesPurge=false` successfully rebuilds links without a terminal. A filtered install rebuilt only codegen links and left its workspace dependencies unresolved; run the full workspace install (or include dependency filters) before testing. Full installation restored all nine maintained workspace projects; source typechecks and 77 generator/preview tests then passed.
- **Update (2026-10-10, renderer example tests):** The same Corepack DNS failure recurred when refreshing the new `@facadeur/examples` dependency for `packages/renderer-dom`; creating its documented local junction from this restricted process also failed with `Access denied`. A temporary TypeScript path mapping to the Example package entry point confirms the renderer package typechecks, but the real workspace link still needs the matching pnpm install outside this process.

## Resolved: codegen did not load the separate example schema library

- **Reproduction:** `pnpm codegen` with Textarea assigned to the `textarea` schema.
- **Cause/evidence:** `examples/project-template.json` has no embedded schema catalog; the definition exists in `examples/schemas.json`, which the CLI command omitted. Validation consistently reported `Schema use on "textarea" references missing schema "textarea"`; this was not a race condition.
- **Impact:** The normal generator command failed; earlier verification used a temporary design document containing the schema library and did not cover this command.
- **Fix (2026-10-05):** Add validated `--schemas <schemas.json>` input and pass `--schemas examples/schemas.json` in the package script. The actual `pnpm codegen` command and separate/embedded-library regression tests now pass.

## Resolved: generated Next demo inferred an external workspace root

- **Reproduction:** `pnpm --dir dist/facadeur next` with an unrelated `D:/newProjects/package-lock.json` alongside the source and generated workspace lockfiles.
- **Evidence/impact:** Next inferred `D:/newProjects` as the workspace root and warned about multiple lockfiles; startup also rewrote the generated tsconfig to add Next plugin/types entries on each regeneration.
- **Fix (2026-10-06):** Generate `outputFileTracingRoot` pointing at the standalone workspace and include Next plugin/type entries in its maintained template. Regenerated development startup and production build pass without the external-root warning or tsconfig rewrite.
