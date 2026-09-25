import { useEffect, useState } from 'react';

export function useDraftCommit<T>(
  value: T,
  onLiveChange: (next: T) => void,
  onCommit: (next: T) => void,
) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  return {
    draft,
    setDraft,
    commit() {
      if (draft !== value) onCommit(draft);
    },
    live(next: T) {
      setDraft(next);
      onLiveChange(next);
    },
  };
}
