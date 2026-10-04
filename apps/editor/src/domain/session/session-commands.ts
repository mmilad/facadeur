import { toNested, type Command, type ProjectController } from '@facadeur/core';
import type { ControllerDocumentStore } from '@facadeur/core';
import { errorText } from './kinds.js';
import { executeProjectCommand } from './session-project.js';
import { logProjectFailure } from '../project/diagnostics.js';
import { applyActiveVariantCommand, variantEditableCommand } from './session-variant-context.js';
import type { EditorSnapshot } from './types.js';

export function bindSessionCommandRunner(deps: {
  getProject: () => ProjectController;
  assetStores: Map<string, ControllerDocumentStore>;
  getOpenId: () => string;
  getSnapshot: () => EditorSnapshot | null;
  resolveKind: (componentId: string) => string | undefined;
  catalogNestedDocuments: () => Map<string, ReturnType<typeof toNested>>;
  getSchemaCatalog: () => import('@facadeur/core').SchemaCatalog | undefined;
  setErrorNotice: (message: string) => void;
  publish: () => void;
}) {
  const {
    getProject,
    assetStores,
    getOpenId,
    getSnapshot,
    resolveKind,
    catalogNestedDocuments,
    getSchemaCatalog,
    setErrorNotice,
    publish,
  } = deps;

  function run(store: ControllerDocumentStore, command: Command) {
    try {
      executeProjectCommand(getProject(), store.getDocument().id, command);
    } catch (error) {
      logProjectFailure(error, {
        phase: 'command',
        document: store.getDocument(),
        command: command.type,
        schemaCatalog: getSchemaCatalog(),
      });
      setErrorNotice(errorText(error));
      publish();
    }
  }

  function runWithActiveVariant(store: ControllerDocumentStore, command: Command) {
    const activeStore = assetStores.get(getOpenId());
    const variantName = getSnapshot()?.activeVariantName;
    if (store !== activeStore || !variantName || !variantEditableCommand(command)) {
      run(store, command);
      return;
    }
    try {
      run(
        store,
        applyActiveVariantCommand({
          store,
          activeStore,
          variantName,
          command,
          resolveKind,
          catalogNestedDocuments,
          getSchemaCatalog,
          commandContext: getProject().commandContext,
        }),
      );
    } catch (error) {
      logProjectFailure(error, {
        phase: 'command',
        document: store.getDocument(),
        command: command.type,
        schemaCatalog: getSchemaCatalog(),
      });
      setErrorNotice(errorText(error));
      publish();
    }
  }

  return runWithActiveVariant;
}
