import type { EditorSession } from '../session';

/** Presentation guard; catalog mutations still go through {@link EditorSession.core}. */
export function readOnlySession(session: EditorSession): EditorSession {
  const refuse = () => session.setNotice('Your role allows viewing this project only.', 'info');
  return {
    ...session,
    executeDesign: refuse,
  };
}
