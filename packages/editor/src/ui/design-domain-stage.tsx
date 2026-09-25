import type { EditorSession, EditorSnapshot } from '../session.js';
import { ViewportEditBar } from './viewport-bar.js';
import type { DesignDomain } from './design-domain.js';
import { designDomainLabel } from './design-domain.js';
import { FontsDomainPanel, TokensDomainPanel } from './design-panels.js';

export function DesignDomainStage({
  session,
  snap,
  domain,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  domain: DesignDomain;
}) {
  const title = designDomainLabel(domain);
  const designTitle = snap.design.name?.trim() || 'project design';

  return (
    <section className="design-domain-stage" aria-label={title} data-design-domain={domain}>
      <header className="design-domain-head">
        <h1 className="design-domain-breadcrumb">
          {title} · {designTitle}
        </h1>
      </header>
      <div className="design-domain-body">
        <ViewportEditBar session={session} snap={snap} />
        {domain === 'fonts' ? (
          <FontsDomainPanel session={session} snap={snap} />
        ) : (
          <TokensDomainPanel session={session} snap={snap} domain={domain} />
        )}
      </div>
    </section>
  );
}
