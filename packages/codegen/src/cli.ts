import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProjectCatalog } from '@facadeur/core';
import { generateReact } from '../engines/react/src/generate';
import { writeGeneratedFiles } from './output';
import { workspaceFiles } from './workspace';

export function parseArgs(args: readonly string[]) {
  let catalogPath: string | undefined;
  let outputPath: string | undefined;
  let storybookPath: string | undefined;
  let workspacePath: string | undefined;
  let nextExample = false;
  let entries: string[] | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--catalog') catalogPath = args[++index];
    else if (arg === '--out') outputPath = args[++index];
    else if (arg === '--storybook') storybookPath = args[++index];
    else if (arg === '--workspace') workspacePath = args[++index];
    else if (arg === '--next-example') nextExample = true;
    else if (arg === '--entries') entries = args[++index]?.split(',').filter(Boolean);
    else if (arg?.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else throw new Error(`Unexpected argument ${arg}`);
  }
  if (!catalogPath) {
    throw new Error(
      'Usage: pnpm codegen --catalog <catalog.json> (--workspace <directory> [--next-example] | --out <directory> [--storybook <directory>]) [--entries <uuid,...>]',
    );
  }
  if (workspacePath && (outputPath || storybookPath)) {
    throw new Error('--workspace cannot be combined with --out or --storybook');
  }
  if (nextExample && !workspacePath) throw new Error('--next-example requires --workspace');
  if (!outputPath && !workspacePath) {
    throw new Error('Specify --out <directory> or --workspace <directory>');
  }
  if (storybookPath && resolve(storybookPath) === resolve(outputPath ?? '')) {
    throw new Error('--storybook must use a different directory from --out');
  }
  return { catalogPath, outputPath, storybookPath, workspacePath, nextExample, entries };
}

export function runCodegen(args: readonly string[]) {
  const options = parseArgs(args);
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const catalog = validateProjectCatalog(
    JSON.parse(readFileSync(resolve(invocationDirectory, options.catalogPath), 'utf8')),
  );
  const generated = generateReact({
    catalog,
    ...(options.entries ? { entries: options.entries } : {}),
  });
  if (options.workspacePath) {
    writeGeneratedFiles(
      resolve(invocationDirectory, options.workspacePath),
      workspaceFiles(generated.ui, generated.stories, options.nextExample, generated.components),
    );
  } else {
    writeGeneratedFiles(resolve(invocationDirectory, options.outputPath!), generated.ui);
    if (options.storybookPath) {
      writeGeneratedFiles(resolve(invocationDirectory, options.storybookPath), generated.stories);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runCodegen(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
