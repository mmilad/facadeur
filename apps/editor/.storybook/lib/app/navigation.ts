import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EditorNavigationAdapter } from '../../../src/ui/shell/navigation/navigation-adapter';

export type StorybookNavigationEvent = {
  action: 'push' | 'replace' | 'pop';
  href: string;
};

export function useStorybookNavigation(
  onNavigation: (event: StorybookNavigationEvent) => void,
): EditorNavigationAdapter {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPopState = () => {
      const next = readLocation();
      setLocation(next);
      onNavigation({ action: 'pop', href: next.pathname + next.search });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [onNavigation]);

  const navigate = useCallback(
    (action: 'push' | 'replace', href: string) => {
      const url = new URL(href, window.location.href);
      const next = { pathname: url.pathname, search: url.search };
      const nextHref = next.pathname + next.search;
      if (action === 'push') window.history.pushState(null, '', nextHref);
      else window.history.replaceState(null, '', nextHref);
      setLocation(next);
      onNavigation({ action, href: nextHref });
    },
    [onNavigation],
  );

  const push = useCallback((href: string) => navigate('push', href), [navigate]);
  const replace = useCallback((href: string) => navigate('replace', href), [navigate]);

  return useMemo(
    () => ({ pathname: location.pathname, search: location.search.slice(1), push, replace }),
    [location.pathname, location.search, push, replace],
  );
}

function readLocation() {
  return { pathname: window.location.pathname, search: window.location.search };
}
