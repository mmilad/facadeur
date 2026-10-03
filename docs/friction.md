# Tooling friction backlog

## Test runner blocked by filesystem sandbox

- **Reproduction:** Run `pnpm exec vitest run apps/editor/test/schema-library.test.ts apps/editor/test/schema-composition-ui.test.tsx` in the restricted workspace process.
- **Evidence:** pnpm 10.33.3 is available locally. Inside the filesystem sandbox, pnpm/Vitest fail with `EPERM` when `fs.promises.realpath` resolves `D:\newProjects\facadeur\apps\editor`. The same focused command succeeds outside the sandbox (13 tests passed).
- **Impact:** Focused tests require running outside the sandbox; normal in-sandbox verification is blocked.
- **Workaround:** Run the same command with the approved outside-sandbox execution. Confirmed with the regular `pnpm` shim, which reports 10.33.3; this is not a package-version mismatch.
- **Next step:** Diagnose why pnpm startup hangs in the sandbox after repository read access is added. If it persists, collect a fresh Windows sandbox log; until then, the approved outside-sandbox run is reliable.

- **Update (2026-10-03):** After `/sandbox-add-read-dir D:\newProjects\facadeur`, `node --version` works in the sandbox, but `pnpm --version` and the focused Vitest command stay silent for more than 10 seconds and must be interrupted. The focused command still passes outside the sandbox (13 tests). Repository read access alone has not resolved this friction; diagnose the pnpm startup hang and collect a fresh Windows sandbox log if it persists.
## Browser automation setup fails

- **Reproduction:** Call `cua.getState()` through `mcp__cua_repl.js` to inspect the running editor window.
- **Evidence:** The CUA kernel exits before returning app/window state with `windows sandbox failed: helper_unknown_error: setup refresh had errors`. Resetting the CUA runtime does not resolve it. This has also prevented visual checks in earlier editor work.
- **Impact:** UI changes can be compiled and tested, but cannot be visually verified through the current Windows browser automation session.
- **Fix:** Restart Codex and retry the native sandbox setup, then collect a fresh Windows sandbox log if it persists. The current user config already selects the recommended `elevated` mode; the repo cannot repair the CUA helper itself.
