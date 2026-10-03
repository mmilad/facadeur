import { runReactCli } from '../engines/react/src/cli';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const engineIndex = args.indexOf('--engine');
  const engine = engineIndex === -1 ? 'react' : args[engineIndex + 1];
  if (engineIndex !== -1) args.splice(engineIndex, 2);
  if (engine !== 'react') throw new Error(`Unknown codegen engine "${engine}"`);
  await runReactCli(args);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
