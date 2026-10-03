# Tooling friction backlog

## Test runner blocked by filesystem sandbox

- **Reproduction:** Run `pnpm exec vitest run apps/editor/test/schema-library.test.ts apps/editor/test/schema-composition-ui.test.tsx` in the restricted workspace process.
- **Evidence:** pnpm 10.33.3 is available locally. Inside the filesystem sandbox, pnpm/Vitest fail with `EPERM` when `fs.promises.realpath` resolves `D:\newProjects\facadeur\apps\editor`. The same focused command succeeds outside the sandbox (13 tests passed).
- **Impact:** Focused tests require running outside the sandbox; normal in-sandbox verification is blocked.
- **Fix:** Allow the test process to resolve workspace paths asynchronously, then verify the focused and full test commands through the normal repo workflow.
