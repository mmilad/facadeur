import type { EditorSession, EditorSnapshot } from '../../domain/session.js';
import { useMemo } from 'react';
import { renderDesignCss } from '@facadeur/tokens';
import {
  FontsDomainPanel,
  IconsDomainPanel,
  TokensDomainPanel,
} from '../sidebar/design/DesignPanels.js';
import { designDomainLabel, type DesignDomain } from '../sidebar/design/design-domain.js';
import { DesignBreakpointControl } from './DesignBreakpointControl.js';
import { TokenPreviewProvider } from '../controls/fields/TokenPreviewContext.js';
import { editorBreakpoints, viewportEditContext } from '../../domain/viewport-edit.js';
import '../form/form.css';

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
  const responsive = domain !== 'fonts' && domain !== 'icons';
  const fontStyles = useMemo(
    () =>
      renderDesignCss(
        {
          tokens: {},
          fonts: snap.design.fonts,
        },
        { selector: '.design-domain-stage' },
      ),
    [snap.design.fonts],
  );
  const ctx = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });

  return (
    <section className="design-domain-stage eu-form" aria-label={title} data-design-domain={domain}>
      <style>{fontStyles}</style>
      <header className="design-domain-head">
        <h1 className="design-domain-breadcrumb">
          {title} · {designTitle}
        </h1>
        {responsive ? (
          <DesignBreakpointControl session={session} snap={snap} />
        ) : (
          <span className="design-resource-scope">Shared project resources</span>
        )}
      </header>
      <div className="design-domain-body">
        <TokenPreviewProvider
          design={snap.design}
          document={snap.design}
          breakpointId={responsive ? ctx.writingBreakpointId : null}
          breakpoints={ctx.breakpoints.slice()}
        >
          {domain === 'fonts' ? (
            <FontsDomainPanel session={session} snap={snap} />
          ) : domain === 'icons' ? (
            <IconsDomainPanel session={session} snap={snap} />
          ) : (
            <TokensDomainPanel key={domain} session={session} snap={snap} domain={domain} />
          )}
        </TokenPreviewProvider>
      </div>
    </section>
  );
}
