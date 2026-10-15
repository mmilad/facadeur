# Tooling friction backlog

## Resolved: Style Engine tests omitted from Vitest allowlist

- **Reproduction:** Run `pnpm exec vitest run packages/style-engine/test/engine.test.ts`.
- **Evidence/impact:** Root `vitest.config.ts` uses an explicit `include` list, so omitted package
  tests returned “No test files found” even when invoked directly.
- **Fix:** Added the maintained compiler, responsive layout, and design CSS suites to the root
  allowlist. The sandbox still cannot resolve the pnpm virtual store (`EPERM`); use CMD for the
  focused run.

## Resolved: Storybook build needs host filesystem access

- **Reproduction:** Run `apps/editor/node_modules/.bin/storybook.CMD build --config-dir .storybook --output-dir storybook-static` from `apps/editor` in the restricted process.
- **Evidence/impact:** Vite/SWC fails with `EPERM` while canonicalizing the Next.js path under `node_modules/.pnpm/next@.../node_modules/next/dist/compiled/react/index.js` or the editor `baseUrl`. The same command succeeds in the approved host context and completes the production build.
- **Workaround:** Run the Storybook build in the approved host context; no dependency or config change is needed.
- **Status (2026-10-09):** Confirmed with a successful Storybook 10.6.1 production build.
- **Restricted-process recurrence (2026-10-09):** Running `storybook dev -p 6006` or `storybook build` through the local CLI builds the manager, then SWC panics with `EPERM` while canonicalizing `apps/editor` as `jsc.baseUrl`. Preview verification still requires the user's host pnpm environment.
- **Update (2026-10-09):** `pnpm --filter @facadeur/editor exec storybook dev -p 6007` first attempts to download the pinned pnpm 10.33.3 through Corepack and fails with `ENOTFOUND registry.npmjs.org`. Invoking `apps/editor/node_modules/.bin/storybook.cmd dev -p 6007` bypasses that lookup but reaches the same SWC `EPERM` while canonicalizing `.` as `jsc.baseUrl`; the current browser tab did not reload the edited source. Use the user's host Storybook process for current-source visual verification.

## Test runner blocked by filesystem sandbox

- **Update (2026-10-15, Catalog style migration):** Restricted
  `pnpm --filter @facadeur/core typecheck` again failed before starting pnpm because Corepack attempted to fetch the pinned
  pnpm 10.33.3 and received `ENOTFOUND registry.npmjs.org`. The same package typechecks ran in
  the approved host context; Core, Style Engine, Examples, Codegen, and Editor all passed.
  Continue using the approved host context for workspace pnpm commands; no pin or install change
  is needed.
- **Update (2026-10-15, style legacy removal):** A restricted Prettier invocation reproduced the
  Corepack `ENOTFOUND registry.npmjs.org` failure before formatting. The approved host-context
  Prettier command completed successfully. Continue using the approved host context for pnpm-based
  formatting and checks.

- **Reproduction:** Run `pnpm exec vitest run apps/editor/test/schema-library.test.ts apps/editor/test/schema-composition-ui.test.tsx` in the restricted workspace process.
- **Evidence:** pnpm 10.33.3 is available locally. Inside the filesystem sandbox, pnpm/Vitest fail with `EPERM` when `fs.promises.realpath` resolves `D:\newProjects\facadeur\apps\editor`. The same focused command succeeds outside the sandbox (13 tests passed).
- **Impact:** Focused tests require running outside the sandbox; normal in-sandbox verification is blocked.
- **Update (2026-10-10, spacing settings):** `pnpm --filter @facadeur/editor typecheck` was blocked before TypeScript ran with `EPERM` from `realpath` on `D:\newProjects\facadeur\apps\editor`. This prevents authoritative editor typecheck in the restricted process; run the same command in the user's CMD environment.
- **Workaround:** Run the same command with the approved outside-sandbox execution. Confirmed with the regular `pnpm` shim, which reports 10.33.3; this is not a package-version mismatch.
- **Resolution:** Use the approved host context for pnpm verification; the restricted process's filesystem/Corepack isolation is not repaired by repository read access.
- **Update (2026-10-10, token test ownership):** Direct Vitest invocation in the restricted process fails before collection with the same `EPERM` resolving `node_modules/.pnpm/vitest@.../dist/spy.js`. Core typecheck passes. The user's CMD run initially exposed stale tier and indexed-font expectations; after correcting both, the same command passes all 10 tests. This confirms host execution is the working test path while the sandbox limitation remains.
- **Update (2026-10-10, style-engine legacy test retirement):** Direct `node_modules/.bin/vitest.cmd run packages/style-engine/test/design-css.test.ts` again fails before collection with `EPERM` resolving Vitest under `node_modules/.pnpm`. The same focused suite passes in the approved host context (6 tests); Style Engine typecheck runs successfully there as well. Use the approved host context for Vitest; direct in-sandbox invocation remains blocked by virtual-store path access.
- **Update (2026-10-10, package manager pin):** Root `package.json` already pins `packageManager: "pnpm@10.33.3"`, matching the user's CMD (`pnpm v10.33.3`). In the restricted shell, Corepack initially looked for that exact version in its isolated cache and attempted a blocked registry download (`ENOTFOUND`). Setting `COREPACK_HOME` to the user's existing `C:\Users\smb_r\AppData\Local\node\corepack` cache makes `pnpm --version` report 10.33.3; the test command then reaches the separate sandbox `EPERM` on workspace `node_modules`. Running `pnpm test` through the approved host context succeeds: 21 files, 85 tests. No second pin or repository package-manager change is needed; use the approved host context for pnpm commands that access the workspace install.

- **Update (2026-10-03):** After `/sandbox-add-read-dir D:\newProjects\facadeur`, `node --version` works in the sandbox, but `pnpm --version` and the focused Vitest command stay silent for more than 10 seconds and must be interrupted. The focused command still passes outside the sandbox (13 tests). Repository read access alone has not resolved this friction; diagnose the pnpm startup hang and collect a fresh Windows sandbox log if it persists.
- **Update (2026-10-03):** Directly invoking `node node_modules/vitest/vitest.mjs run apps/editor/test/automatic-field-forwarding-ui.test.tsx apps/editor/test/component-contract.test.ts` starts immediately but Vitest then fails resolving `node_modules/.pnpm/.../vitest/dist/spy.js` with `EPERM` from `fs.realpath`. This reproduces the same sandbox boundary at the pnpm virtual store, even when bypassing pnpm startup. The focused checks need the approved outside-sandbox run until that path resolution issue is fixed.
- **Update (2026-10-04):** The same `EPERM` realpath failure recurred when running five focused schema tests through the direct Vitest CLI. The identical command then started outside the sandbox; this time it exposed an actual fixture mismatch (`Preview refers to unknown field "value"`), which was corrected by making the fixture schema declare that field.
- **Update (2026-10-04):** During Core ownership cleanup, `pnpm.cmd --version` again stayed silent beyond 10 seconds. Bypassing pnpm and invoking `node_modules/.bin/vitest.cmd run packages/core/test` (also with one worker for `model.test.ts`) reproducibly fails before collecting tests with `EPERM: operation not permitted, realpath` for `node_modules/.pnpm/.../vitest/dist/spy.js`; the matching Core typecheck and ESLint commands do run. This leaves the latest sandboxed test result unavailable; rerun Core tests in the matching pnpm environment outside the sandbox.
- **Update (2026-10-04, controller migration):** `pnpm --filter @facadeur/core typecheck` and `pnpm exec vitest run packages/core/test` again stayed silent for over a minute. Direct `node node_modules/typescript/bin/tsc --noEmit -p packages/core/tsconfig.json` works in the sandbox; approved `node node_modules/vitest/vitest.mjs run packages/core/test` outside it passes all 132 existing Core tests. This restores task verification; the pnpm sandbox startup issue remains open.
- **Update (2026-10-04, style controller):** `node node_modules/vitest/vitest.mjs run packages/core/test` again fails inside the sandbox before collecting tests with `EPERM` resolving Vitest's `dist/spy.js`. The identical approved outside-sandbox command passes all 135 Core tests; regular `pnpm -r --if-present typecheck` also passes outside the sandbox. The existing workaround remains required.

## Resolved: Run pnpm verification in the approved host context

- **Update (2026-10-12, layer class styles):** Restricted Core and Editor typechecks both stopped
  in Corepack before TypeScript ran, attempting to download the pinned pnpm 10.33.3 and failing
  with `ENOTFOUND registry.npmjs.org`. The same commands completed in the approved host context
  (Core passed; Editor passed after fixing one local type error). Run pnpm checks in the approved
  host context when this recurs; no package-manager or repository workaround is needed.

- **Update (2026-10-12, Facadeur JSON seed):** Restricted `pnpm exec prettier --write <affected files>`
  attempted to download pinned pnpm 10.33.3 and failed with `ENOTFOUND registry.npmjs.org`. The same
  command passed in the approved host context; workspace typecheck and the JSON/factory consistency
  check passed there too. Continue using the approved host context; no Corepack pin or install
  change is needed.
- **Update (2026-10-12, responsive header):** `pnpm exec prettier --write <affected files>` again
  stopped before formatting because the restricted process tried to download pinned pnpm 10.33.3
  from `registry.npmjs.org` and failed with `ENOTFOUND`. The identical command succeeded in the
  approved host context. Continue using that context for workspace pnpm commands; no repository
  package-manager change is needed.
- **Update (2026-10-11):** With the user's Corepack cache configured, restricted Vitest still fails
  before collection with `EPERM` resolving `node_modules/.pnpm/vitest.../dist/spy.js`. The same
  focused suites pass in the approved host-context execution; the full root suite passes 59 files /
  212 tests. This isolates the issue to sandbox filesystem permissions; deleting `.bin` is
  unnecessary. Use approved host-context execution for pnpm tests.

- **Update (2026-10-04, hydration debugging):** `pnpm exec prettier --write <affected editor files>` stays silent and eventually reports `GET https://registry.npmjs.org/pnpm: fetch failed` in the sandbox. The direct local invocation `node node_modules/prettier/bin/prettier.cjs --write <affected editor files>` succeeds without network access. Use the installed CLI for formatting; fix the pnpm shim's version lookup to use the locally installed pinned version offline.

- **Reproduction:** Run pnpm commands from the restricted workspace process. Depending on the command, Corepack attempts to fetch the project pin or pnpm fails resolving `node_modules` with `EPERM`.
- **Evidence:** `package.json` pins pnpm 10.33.3, matching the user's CMD. The restricted process sets an isolated `COREPACK_HOME` without that package-manager cache and denies `realpath` access to the workspace install. Pointing `COREPACK_HOME` to the user's cache resolves version lookup but not the filesystem restriction.
- **Impact:** Installs and checks can stop before reaching project code in the restricted process.
- **Fix:** Run the same pnpm command in the approved host context. Do not change the pin or add a project-specific cache path.
- **Update (2026-10-09, inspector boundary):** `pnpm --filter @facadeur/core typecheck` and `pnpm --filter @facadeur/editor typecheck` both stop before reaching project code while Corepack tries to fetch the pinned pnpm 10.33.3 from `registry.npmjs.org` (`ENOTFOUND`). Direct local TypeScript invocations start but report the already-known workspace source/dependency-link errors; they report no diagnostics in the new inspector modules. The pinned pnpm lookup remains the blocker for authoritative workspace typechecks.
- **Update (2026-10-09, form inputs):** Both filtered pnpm typecheck commands again stop at Corepack's attempt to fetch pnpm 10.33.3 (`getaddrinfo ENOTFOUND registry.npmjs.org`). Direct package TypeScript succeeds for `packages/form`; the editor TypeScript run reports the known workspace errors and no diagnostics in changed form/token files. The network/DNS cause and local-binary workaround remain unchanged.
- **Update (2026-10-10):** With `COREPACK_HOME=C:\Users\smb_r\AppData\Local\node\corepack`, the restricted process reaches the user's pnpm 10.33.3 but still fails on `realpath` for workspace `node_modules`/workspace links (`EPERM`). The approved host-context run of `pnpm test` now passes 24 files / 95 tests. The Editor typecheck reaches TypeScript and reports the two known diagnostics in `CatalogPreviewDataStage` FieldValue nullability and the missing `jsonjoy-builder` declaration. Use the approved host-context route for checks; the user does not need to rerun commands in CMD.
- **Update (2026-10-10, repeated fixture cleanup):** The restricted process again fell back to Corepack's isolated cache when invoking `pnpm exec prettier` / Vitest, attempting to download pinned pnpm 10.33.3 and failing with `ENOTFOUND registry.npmjs.org`. The user's CMD host had previously run the full suite successfully. Impact: final focused and full validation cannot run in this shell; continue source review and ask for CMD validation only after the migration batch is ready.
- **Update (2026-10-04, structural renderer):** `pnpm exec vitest run packages/renderer-dom/test/render.test.ts` stayed silent for over 30 seconds in the restricted process and had to be interrupted. The focused test run therefore needs the documented matching pnpm environment outside the sandbox; no test runner output was produced before interruption.
- **Resolution (2026-10-10):** The private deprecated `packages/renderer-dom` package and its legacy tests were retired after confirming no production callers; this specific reproduction no longer exists. For maintained pnpm checks, the approved host context now runs the pinned workspace pnpm successfully.

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
- **Fix (2026-10-10):** `pnpm install --offline --ignore-scripts --config.confirmModulesPurge=false` succeeds in the approved host context and refreshes the complete workspace. The restricted process still cannot launch the cached package manager or create junctions directly; use the approved host command when links change.

- **Update (2026-10-06):** The same no-TTY purge request recurred after removing generated workspace packages. `pnpm install --frozen-lockfile --ignore-scripts --config.confirmModulesPurge=false` successfully rebuilds links without a terminal. A filtered install rebuilt only codegen links and left its workspace dependencies unresolved; run the full workspace install (or include dependency filters) before testing. Full installation restored all nine maintained workspace projects; source typechecks and 77 generator/preview tests then passed.

## Resolved: codegen did not load the separate example schema library

- **Reproduction:** `pnpm codegen` with Textarea assigned to the `textarea` schema.
- **Cause/evidence:** `examples/project-template.json` has no embedded schema catalog; the definition exists in `examples/schemas.json`, which the CLI command omitted. Validation consistently reported `Schema use on "textarea" references missing schema "textarea"`; this was not a race condition.
- **Impact:** The normal generator command failed; earlier verification used a temporary design document containing the schema library and did not cover this command.
- **Fix (2026-10-05):** Add validated `--schemas <schemas.json>` input and pass `--schemas examples/schemas.json` in the package script. The actual `pnpm codegen` command and separate/embedded-library regression tests now pass.
- **Superseded (2026-10-11):** Catalog-based Codegen replaced the DocumentFile CLI and the old JSON templates. The current CLI validates a Catalog, whose schema library is part of the input; the reproduction and `--schemas` workaround above describe only the retired generator.

## Resolved: generated Next demo inferred an external workspace root

- **Reproduction:** `pnpm --dir dist/facadeur next` with an unrelated `D:/newProjects/package-lock.json` alongside the source and generated workspace lockfiles.
- **Evidence/impact:** Next inferred `D:/newProjects` as the workspace root and warned about multiple lockfiles; startup also rewrote the generated tsconfig to add Next plugin/types entries on each regeneration.
- **Fix (2026-10-06):** Generate `outputFileTracingRoot` pointing at the standalone workspace and include Next plugin/type entries in its maintained template. Regenerated development startup and production build pass without the external-root warning or tsconfig rewrite.

## Resolved: run pnpm verification in the approved host context

- **Reproduction:** Run `pnpm test` or `pnpm --filter @facadeur/editor typecheck` in the
  restricted process with `COREPACK_HOME=C:\Users\smb_r\AppData\Local\node\corepack`.
- **Evidence:** Corepack selects the pinned pnpm 10.33.3, then pnpm fails before the scripts run
  with `EPERM` resolving `D:\newProjects\facadeur\node_modules` or the workspace root. The
  bundled fallback pnpm is 11.25.0 and does not match the repository pin.
- **Impact:** This process cannot authoritatively validate Editor changes.
- **Workaround:** Run checks through the approved host pnpm context. No repository pin change is
  indicated; the failure is filesystem access after version resolution.
- **Update (2026-10-10, shell test):** The approved host-context command
  `pnpm exec vitest run apps/editor/test/shell.test.tsx` succeeds with the user's pinned pnpm. The
  sandbox still has the documented `EPERM`, but no CMD rerun is needed. The shell test's React
  warnings included a separate test cleanup bug: its `afterEach` manually called Testing Library's
  already-registered automatic `cleanup()` inside `act()`, causing duplicate unmounts. Removing
  that manual cleanup eliminated the unmount errors, but a subsequent host run still showed `act`
  warnings during keyboard edits. Those trigger a Stage animation-frame update to the zoom session;
  the key helper now waits for two animation frames inside `act`. A fresh host run is pending to
  verify the warning fix. **Resolution (2026-10-11):** the focused host run passes 5/5 without React
  warnings using the two-frame helper.
- **Update (2026-10-11):** Running that pnpm command from the restricted workspace again selected
  Corepack but tried to download the pinned pnpm 10.33.3 from `registry.npmjs.org`, failing with
  `ENOTFOUND` before Vitest started because this shell did not inherit the user's Corepack home.
  Setting `COREPACK_HOME=C:\Users\smb_r\AppData\Local\node\corepack` selects the cached pinned
  version 10.33.3, but the restricted process then fails with `EPERM` resolving the workspace
  root. The global `pnpm.cmd` is only a Corepack shim; deleting it would not fix the filesystem
  boundary. **Resolution:** run commands through the approved host context with the user's Corepack
  home; `pnpm test` completes successfully (40 files, 137 tests). No `node_modules` or build-output
  cleanup is needed.
- **Update (2026-10-11, repeated during FieldDefinition cleanup):** With the user's cached
  `COREPACK_HOME`, ordinary restricted execution still failed before scripts with `EPERM` resolving
  the repository `node_modules`. Re-running through the approved host context succeeded without
  deleting any binaries: `pnpm test` passed 45 files / 156 tests, and Editor typecheck passed.
  This confirms the installed pnpm binary and workspace install are healthy; the failure is limited
  to the restricted process. Use approved host execution when it recurs; deleting `node_modules` is
  not indicated by this evidence.
- **Update (2026-10-11, LayoutControl cleanup):** Restricted execution again failed before the
  script with `EPERM` resolving `D:\newProjects\facadeur\apps\editor`, even with the user's
  `COREPACK_HOME`. The approved host context ran the same pinned pnpm successfully: Editor typecheck
  passed, root tests passed 46 files / 154 tests, and Storybook built. No binary or install cleanup
  was needed; route pnpm checks through the approved host context when this recurs.
- **Update (2026-10-11, Core validation assertions):** Plain restricted `pnpm` again attempted to
  fetch pinned pnpm 10.33.3 and failed with `ENOTFOUND registry.npmjs.org`. Setting the user's
  cached `COREPACK_HOME` resolved the package manager, but restricted pnpm then hit `EPERM` resolving
  the workspace root. The same checks in the approved host context passed: workspace typecheck and
  root suite (70 files / 247 tests). Use host-context pnpm with the user's Corepack home; deleting
  binaries or `node_modules` is not indicated.
- **Resolution verified (2026-10-11, Binding/Variant control cleanup):** The ordinary restricted
  process again failed before script startup with `EPERM` resolving workspace `node_modules`, even
  after setting the user's `COREPACK_HOME`. Running through the approved host context with the same
  pinned pnpm succeeded: `pnpm test` passed 71 files / 253 tests, and the Editor typecheck passed.
  The install and pnpm binary are healthy; use approved host execution for repository checks. No
  install or binary cleanup is needed.
- **Update (2026-10-11, Form binding audit):** Plain restricted `pnpm` again used Corepack without
  the user's cache and failed to download pinned pnpm 10.33.3 (`ENOTFOUND registry.npmjs.org`). A
  direct local `tsc` invocation ran with incomplete dependency typings and produced unrelated
  React type errors; the approved host-context `pnpm --filter @facadeur/editor typecheck` with the
  user's `COREPACK_HOME` passed. Use the same approved host invocation for authoritative checks;
  the issue remains process isolation, not the installed binaries.
- **Update (2026-10-11, architecture cleanup audit):** With `COREPACK_HOME` set to the user's
  cache, restricted `pnpm test` still failed before startup with `EPERM` resolving workspace
  `node_modules`. The approved host-context run of `pnpm test` passed 71 files / 254 tests, and
  `pnpm typecheck` passed across the workspace. Continue routing authoritative pnpm checks through
  the approved host context; no binary or install cleanup is needed.
- **Update (2026-10-11, Flat cleanup verification):** An unapproved restricted `pnpm exec prettier`
  invocation again selected Corepack without the host cache and failed fetching pinned pnpm 10.33.3
  (`ENOTFOUND registry.npmjs.org`). Rerunning Prettier through the approved host context passed;
  `pnpm test` passed 71 files / 252 tests and workspace `pnpm typecheck` passed there as well.
  Continue using the approved host context for pnpm commands; no binary or install cleanup is needed.
- **Resolution verified (2026-10-11, Catalog Codegen migration):** The approved host-context
  commands `pnpm test`, `pnpm typecheck`, scoped `pnpm exec eslint`, and changed-file
  `pnpm exec prettier --check` all completed successfully with the pinned pnpm 10.33.3. Root tests
  passed 74 files / 262 tests. No Corepack, filesystem, or dependency-link failure recurred; use
  this host context for repository checks if restricted execution fails again.
- **Update (2026-10-11, schema ownership review):** Restricted `pnpm exec prettier --check
docs/plan.md` attempted to fetch pinned pnpm 10.33.3 and failed with `ENOTFOUND`; the same
  command through approved host execution ran successfully and identified formatting to fix. Use
  the approved host context for package-manager commands; no install or binary cleanup is needed.
- **Update (2026-10-13, clipboard save):** Restricted editor typecheck and scoped lint/format
  commands again selected Corepack without the host cache and failed fetching pinned pnpm 10.33.3
  (`ENOTFOUND registry.npmjs.org`). The approved host-context editor typecheck and scoped ESLint
  passed. Continue using the approved host context for pnpm checks; no install or pin change is
  needed.
- **Update (2026-10-15, Storybook schema editor):** Restricted pnpm again attempted to fetch the
  pinned pnpm 10.33.3 and failed with `ENOTFOUND registry.npmjs.org`. The Form and Editor typechecks,
  Prettier, and Storybook build passed through the approved host context. Continue using that
  context for repository checks; no install or pin change is needed.

## Cloud verification process limits (2026-10-11)

- Reproduction: `corepack pnpm exec tsx -e <Catalog export>` in the Work cloud checkout.
- Evidence: tsx attempts an IPC socket at `/tmp/tsx-0/*.pipe` and fails with `listen EPERM`
  before project code. `node --import tsx` executes the same Catalog export/CLI successfully.
- Workaround: use `node --import tsx --input-type=module -e <script>` or
  `node --import tsx packages/codegen/src/cli.ts <arguments>` in this environment.
  The configured execution tools expose no separate approved Windows host context here.
- Impact: CLI shim verification is blocked, but the actual CLI and generated output can be checked.
- Fix: enable Unix IPC socket creation for tsx in the cloud runner; keep the repository pin.
- Root `corepack pnpm test` also hit the management route suite's 10-second setup timeout under
  default concurrency (75 suites passed, 273 tests passed). Its isolated rerun passed. Use
  `corepack pnpm test --maxWorkers=2` to reduce runner contention without changing test timeouts.

- Verified: `corepack pnpm test --maxWorkers=2` passes all 77 suites / 277 tests, including
  the management backend; no timeout increase or test skip was needed.

## Resolved: cloud checkout selects unpinned pnpm by default

- **Reproduction (2026-10-11):** In a fresh cloud checkout, `pnpm install --frozen-lockfile`
  selects pnpm 11.25.0 despite the repository's 10.33.3 pin, inserts an `allowBuilds` placeholder
  into `pnpm-workspace.yaml`, and fails with `ERR_PNPM_IGNORED_BUILDS` for esbuild.
- **Impact:** Installation fails and creates unrelated workspace configuration changes. Switching
  to Corepack on that install requires replacing the modules directory; noninteractive install
  otherwise fails with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`.
- **Fix verified:** Restore the generated workspace configuration edit and run
  `CI=true corepack pnpm install --frozen-lockfile`. Installation completes with pnpm 10.33.3
  and esbuild's already-approved build. Use `corepack pnpm` for subsequent cloud checks;
  no repository dependency or package-manager pin change is needed.

## Cloud verification concurrency

- **Reproduction (2026-10-11):** Running workspace typecheck, the default full Vitest suite,
  and focused UI suites concurrently in the cloud checkout caused existing management setup
  (10s), project-storage (5s), and token-table (5s) timeouts.
- **Impact:** Timing failures obscure structural verification; no assertion failure established
  a behavior regression. The overlapping full run was stopped.
- **Workaround:** Run `corepack pnpm test --maxWorkers=2` without another test run. The token-table
  cases then passed, but a design-domain UI test still exceeded 5s under shared host load. Use
  `corepack pnpm test --maxWorkers=2 --testTimeout=30000 --hookTimeout=30000` for this cloud
  verification. Keep repository configuration and assertions unchanged; record the CLI allowances
  with the final result.
- **Result:** The combined branch passes 77 test files / 279 tests with those CLI allowances;
  all 11 workspace typechecks also pass. No timeout configuration or test assertion was changed.
