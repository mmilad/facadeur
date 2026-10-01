import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';

export class ProjectError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ProjectError';
  }
}

export interface ProjectState {
  update: string;
  stateVector: string;
  revision: number;
  savedRevision: number;
}

export interface DurableEntry extends ProjectState {
  source: string;
  hash: string | null;
  pending?: { previousHash: string | null; content: string };
}

export interface DurableProject {
  version: 1;
  directory: string;
  entries: Record<string, DurableEntry>;
}

export function hash(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

export function sourceHash(path: string): string | null {
  if (!existsSync(path)) return null;
  if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) {
    throw new ProjectError(409, `Source is not a regular file: ${path}`);
  }
  return hash(readFileSync(path));
}

/** Flush bytes before the atomic rename; never expose a partially written JSON file. */
export function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporary, 'wx');
    writeFileSync(descriptor, content, 'utf8');
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, path);
    // Windows does not support opening directories for fsync.
    if (process.platform !== 'win32') {
      const directory = openSync(dirname(path), 'r');
      try {
        fsyncSync(directory);
      } finally {
        closeSync(directory);
      }
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export function protect<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new ProjectError(500, error instanceof Error ? error.message : String(error));
  }
}

export function invalid<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new ProjectError(400, error instanceof Error ? error.message : String(error));
  }
}

export function decodeUpdate(value: string): Uint8Array {
  if (
    typeof value !== 'string' ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  ) {
    throw new ProjectError(400, 'Invalid base64 Yjs state');
  }
  return Buffer.from(value, 'base64');
}
