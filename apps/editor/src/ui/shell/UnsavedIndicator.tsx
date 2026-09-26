export function UnsavedIndicator({
  documentDirty = false,
  designDirty = false,
}: {
  documentDirty?: boolean;
  designDirty?: boolean;
}) {
  if (!documentDirty && !designDirty) return null;
  return (
    <div className="unsaved-indicator" role="status" aria-live="polite">
      {documentDirty ? (
        <span className="unsaved-badge" data-unsaved="document">
          Unsaved · Document
        </span>
      ) : null}
      {designDirty ? (
        <span className="unsaved-badge" data-unsaved="design">
          Unsaved · Design
        </span>
      ) : null}
    </div>
  );
}
