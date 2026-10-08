import type { Command } from '@facadeur/core';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { ProjectError, type ProjectRepository } from './project/index';

const LIMIT = 10 * 1024 * 1024;

export function createProjectServer(
  project: ProjectRepository,
  options: { editorPort?: number } = {},
) {
  const editorPort = options.editorPort ?? 3001;
  const peers = new Map<WebSocket, string | null>();
  const knownIds = new Set(Object.keys(project.snapshot().states));
  function allowedOrigin(origin: string | undefined): boolean {
    if (!origin) return true;
    return [`http://localhost:${editorPort}`, `http://127.0.0.1:${editorPort}`].includes(origin);
  }
  function allowedHost(host: string | undefined): boolean {
    return !!host && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  }
  const server = createServer((request, response) => {
    void handleRequest(request, response).catch((error: unknown) => {
      respond(response, error instanceof ProjectError ? error.status : 400, {
        error: error instanceof Error ? error.message : 'Invalid request',
      });
    });
  });
  const sockets = new WebSocketServer({ noServer: true, maxPayload: LIMIT });
  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (
        url.pathname !== '/sync' ||
        url.searchParams.get('project') !== 'default' ||
        !allowedHost(request.headers.host) ||
        !allowedOrigin(request.headers.origin)
      ) {
        socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        return;
      }
      const documentId = url.searchParams.get('id');
      if (documentId !== null) project.getState(documentId);
      sockets.handleUpgrade(request, socket, head, (client) => {
        peers.set(client, documentId);
        if (documentId === null) send(client, { type: 'catalog', project: project.snapshot() });
        client.on('close', () => peers.delete(client));
        client.on('error', () => peers.delete(client));
        client.on('message', (bytes, binary) => {
          let requestId: string | undefined;
          let id: string | undefined = documentId ?? undefined;
          const scope = () => (documentId === null ? { id } : {});
          try {
            if (binary) throw new Error('Expected a JSON message');
            const message = object(JSON.parse(bytes.toString()));
            if (typeof message.requestId === 'string') requestId = message.requestId;
            if (documentId === null) {
              if (typeof message.id === 'string') id = message.id;
              if (!id) throw new Error('Missing document id');
              project.getState(id);
            }
            if (message.type === 'sync') {
              const state = project.getState(id!);
              const doc = new Y.Doc();
              try {
                Y.applyUpdate(doc, decode(state.update));
                send(client, {
                  type: 'sync',
                  ...scope(),
                  ...state,
                  update: encode(Y.encodeStateAsUpdate(doc, decode(message.stateVector))),
                });
              } finally {
                doc.destroy();
              }
            } else if (message.type === 'update') {
              if (!requestId || requestId.length > 200) throw new Error('Missing requestId');
              const state = project.applyUpdate(id!, decode(message.update));
              send(client, {
                type: 'ack',
                ...scope(),
                requestId,
                revision: state.revision,
                savedRevision: state.savedRevision,
              });
            } else throw new Error('Unknown sync message');
          } catch (error) {
            send(client, {
              type: 'error',
              ...scope(),
              requestId,
              message: error instanceof Error ? error.message : 'Invalid update',
            });
          }
        });
      });
    } catch {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
    }
  });
  const unsubscribe = project.subscribe((id, state) => {
    const created = !knownIds.has(id);
    if (created) {
      knownIds.add(id);
      const catalog = { type: 'catalog', project: project.snapshot() };
      for (const [client, documentId] of peers) {
        if (documentId === null) send(client, catalog);
      }
    }
    for (const [client, documentId] of peers) {
      if (documentId === id) send(client, { type: 'update', ...state });
      else if (documentId === null && !created) send(client, { id, type: 'update', ...state });
    }
  });
  async function handleRequest(request: IncomingMessage, response: ServerResponse) {
    if (!allowedHost(request.headers.host) || !allowedOrigin(request.headers.origin))
      return respond(response, 403, { error: 'Host or origin not allowed' });
    if (request.headers.origin) {
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
      response.setHeader('Vary', 'Origin');
    }
    response.setHeader('Cache-Control', 'no-store');
    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.writeHead(204);
      response.end();
      return;
    }
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method === 'GET' && url.pathname === '/health')
      return respond(response, 200, { ok: true });
    if (request.method === 'GET' && url.pathname === '/api/projects/default')
      return respond(response, 200, project.snapshot());
    if (request.method === 'POST' && url.pathname === '/api/projects/default/documents') {
      const body = await readBody(request);
      return respond(
        response,
        201,
        project.create(
          body.document as never,
          body.update === undefined ? undefined : decode(body.update),
        ),
      );
    }
    const match = /^\/api\/projects\/default\/documents\/([^/]+)(?:\/(edit|save))?$/.exec(
      url.pathname,
    );
    if (!match) return respond(response, 404, { error: 'Unknown endpoint' });
    const id = decodeURIComponent(match[1]!);
    if (request.method === 'GET' && !match[2]) {
      const snapshot = project.snapshot();
      const document =
        id === snapshot.design.id
          ? snapshot.design
          : snapshot.documents.find((doc) => doc.id === id);
      return respond(response, 200, { document, ...project.getState(id) });
    }
    if (request.method !== 'POST' || !match[2])
      return respond(response, 405, { error: 'Method not allowed' });
    const body = await readBody(request);
    if (!Number.isSafeInteger(body.revision) || (body.revision as number) < 0)
      throw new Error('Expected a non-negative revision');
    const state =
      match[2] === 'edit'
        ? project.edit(id, body.command as Command, body.revision as number)
        : project.save(id, body.revision as number);
    const snapshot = project.snapshot();
    const document =
      id === snapshot.design.id ? snapshot.design : snapshot.documents.find((doc) => doc.id === id);
    return respond(response, 200, { ...state, document });
  }
  async function close() {
    unsubscribe();
    for (const client of peers.keys()) client.terminate();
    await new Promise<void>((resolve) => sockets.close(() => resolve()));
    if (server.listening)
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
  }
  return { server, close };
}

function respond(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}
function send(client: WebSocket, value: unknown) {
  if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(value));
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected an object');
  return value as Record<string, unknown>;
}
async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (!request.headers['content-type']?.startsWith('application/json'))
    throw new Error('Expected application/json');
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > LIMIT) throw new Error('Request too large');
    chunks.push(chunk);
  }
  return object(JSON.parse(Buffer.concat(chunks).toString('utf8')));
}
function encode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}
function decode(value: unknown): Uint8Array {
  if (
    typeof value !== 'string' ||
    value.length > LIMIT * 1.4 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  )
    throw new Error('Invalid base64 update');
  return new Uint8Array(Buffer.from(value, 'base64'));
}
