import type { EditorSession, EditorSnapshot } from '../../domain/session.js';
import { useMemo } from 'react';
import { renderDesignCss } from '@facadeur/tokens';
import {
  FontsDomainPanel,
  IconsDomainPanel,
  TokensDomainPanel,
} from '../sidebar/design/DesignPanels.js';
import {
  designDomainLabel,
  isSettingsTokenDomain,
  SETTINGS_TOKEN_DOMAIN_ITEMS,
  type DesignDomain,
} from '../sidebar/design/design-domain.js';
import { DesignBreakpointControl } from './DesignBreakpointControl.js';
import { TokenPreviewProvider } from '../controls/fields/TokenPreviewContext.js';
import { editorBreakpoints, viewportEditContext } from '../../domain/viewport/viewport-edit.js';
import '../form/form.css';

export function DesignDomainStage({
  session,
  snap,
  domain,
  onSelectDomain,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  domain: DesignDomain;
  onSelectDomain: (domain: DesignDomain) => void;
}) {
  const settingsView = isSettingsTokenDomain(domain);
  const title = settingsView ? 'Settings' : designDomainLabel(domain);
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
        <div className="design-domain-head-main">
          <h1 className="design-domain-breadcrumb">
            {settingsView ? `${title} · ${designDomainLabel(domain)}` : `${title} · ${designTitle}`}
          </h1>
          {settingsView ? (
            <nav className="design-settings-tabs" aria-label="Settings sections">
              {SETTINGS_TOKEN_DOMAIN_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    domain === item.id ? 'design-settings-tab is-active' : 'design-settings-tab'
                  }
                  data-settings-tab={item.id}
                  aria-current={domain === item.id ? 'page' : undefined}
                  onClick={() => onSelectDomain(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          ) : null}
        </div>
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
