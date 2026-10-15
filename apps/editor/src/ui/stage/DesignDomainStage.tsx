import type { EditorSnapshot } from '../../domain/session';
import type { EditorEvent } from '../../domain/sidebar/events';
import { activeBreakpoints } from '@facadeur/core';
import { FontsDomainPanel } from '../design/FontsDomainPanel';
import { IconsDomainPanel } from '../design/IconsDomainPanel';
import { TokensDomainPanel } from '../design/tokens/TokensDomainPanel';
import {
  designDomainLabel,
  isSettingsTokenDomain,
  type EditorSurface,
  type DesignDomain,
} from '../design/design-domain';
import { ViewportsSettingsPanel } from '../design/ViewportsSettingsPanel';
import { SettingsSections } from '../settings/SettingsSections';
import { TokenPreviewProvider } from '../controls/fields/TokenPreviewContext';
import { viewportEditContext } from '../../domain/viewport/viewport-edit';
import '../styles/form.css';

export function DesignDomainStage({
  snap,
  domain,
  onEvent,
}: {
  snap: EditorSnapshot;
  domain: DesignDomain;
  onEvent: (event: EditorEvent) => void;
}) {
  const settingsView = isSettingsTokenDomain(domain);
  const title = settingsView ? 'Settings' : designDomainLabel(domain);
  const designTitle = 'project design';
  const sharedResources = domain === 'fonts' || domain === 'icons';
  const tokenDomain = !sharedResources && domain !== 'viewports';
  const ctx = viewportEditContext({
    breakpoints: activeBreakpoints(snap.design.breakpoints),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });

  return (
    <section className="design-domain-stage eu-form" aria-label={title} data-design-domain={domain}>
      <header className="design-domain-head">
        <div className="design-domain-head-main">
          <h1 className="design-domain-breadcrumb">
            {settingsView ? `${title} · ${designDomainLabel(domain)}` : `${title} · ${designTitle}`}
          </h1>
          {settingsView ? <SettingsSections surface={domain} onEvent={onEvent} /> : null}
        </div>
        {sharedResources ? (
          <span className="design-resource-scope">Shared project resources</span>
        ) : null}
      </header>
      <div className="design-domain-body">
        <TokenPreviewProvider
          design={snap.design}
          breakpointId={tokenDomain ? ctx.writingBreakpointId : null}
          breakpoints={ctx.breakpoints.slice()}
        >
          {domain === 'fonts' ? (
            <FontsDomainPanel snap={snap} onEvent={onEvent} />
          ) : domain === 'icons' ? (
            <IconsDomainPanel snap={snap} />
          ) : domain === 'viewports' ? (
            <ViewportsSettingsPanel breakpoints={snap.design.breakpoints} onEvent={onEvent} />
          ) : (
            <TokensDomainPanel key={domain} snap={snap} domain={domain} onEvent={onEvent} />
          )}
        </TokenPreviewProvider>
      </div>
    </section>
  );
}
