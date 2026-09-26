import { Suspense } from 'react';
import { EditorBootstrap } from './EditorBootstrap';

export default function HomePage() {
  return (
    <Suspense fallback={<p className="boot-error">Loading editor…</p>}>
      <EditorBootstrap />
    </Suspense>
  );
}
