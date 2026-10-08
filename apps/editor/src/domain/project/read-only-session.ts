import type { EditorSession } from '../session';

/** Presentation guard; catalog mutations still go through {@link EditorSession.core}. */
export function readOnlySession(session: EditorSession): EditorSession {
  const refuse = () => session.setNotice('Your role allows viewing this project only.', 'info');
  return {
    ...session,
    execute: refuse,
    executeDesign: refuse,
    executeDocument: refuse,
    setNestedField: refuse,
    loadDocument: refuse,
    undo: refuse,
    redo: refuse,
    saveOpenDocument: async () => {
      refuse();
      return false;
    },
    saveDesign: async () => {
      refuse();
      return false;
    },
  };
}
