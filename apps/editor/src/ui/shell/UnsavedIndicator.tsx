export function UnsavedIndicator({ designDirty = false }: { designDirty?: boolean }) {
  if (!designDirty) return null;
  return (
    <div className="unsaved-indicator" role="status" aria-live="polite">
      {designDirty ? (
        <span className="unsaved-badge" data-unsaved="design">
          Unsaved · Design
        </span>
      ) : null}
    </div>
  );
}
