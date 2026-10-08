import { breakpointLabel, readTokenTree } from '@facadeur/core';
import { activeBreakpoints } from '@facadeur/tokens';
import { useMemo, useState } from 'react';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontWeightTokenRefs,
  numberTokenRefs,
  shadowTokenRefs,
} from '../../../../domain/editing';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import { formatTokenValue } from '../../../../domain/edits/token-edit';
import { viewportEditContext } from '../../../../domain/viewport/viewport-edit';
import {
  projectFontRefs,
  projectFontWeightOptions,
  type TypographyCatalogs,
} from '../../../controls/typography/index';
import type { DesignDomain } from '../design-domain';
import { designDomainLabel, tokenMatchesDomain } from '../design-domain';
import { ViewportTabs } from '../ViewportTabs';
import { ColorTokenAddRow } from './ColorsTokenCrud';
import { RadiusTokenAddRow } from './RadiusTokenCrud';
import { SpacingTokenAddRow } from './SpacingTokenCrud';
import { ShadowTokenAddRow } from './ShadowTokenCrud';
import { TypographyTokenAddRow } from './TypographyTokenCrud';
import {
  effectiveBreakpointValue,
  groupTokens,
  type TableToken,
} from './token-breakpoint-helpers';
import { TokenTableRow } from './token-table-row';
import { tokenLeafLabel, tokenTitle } from './token-labels';
import { tokenDisplayLabel } from '../../../controls/token-presentation';
import { useTokenResolver } from '../../../controls/fields/TokenPreviewContext';
import {
  naturalTokenCompare,
  tokenMatchesQuery,
  TokenTable,
  TokenTableGroup,
  TokenTableToolbar,
} from './TokenTable';
import '../token-tables.css';

type TokenDomain = Exclude<DesignDomain, 'fonts' | 'icons' | 'viewports'>;

export function TokensDomainPanel({
  session,
  snap,
  domain,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  domain: TokenDomain;
}) {
  const resolve = useTokenResolver();
  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const tokens = useMemo(() => {
    const indexed = readTokenTree(snap.design.tokens);
    return [...indexed.tokens.values()]
      .filter((token) => tokenMatchesDomain(token.path, token.type, domain))
      .sort((left, right) => naturalTokenCompare(left.path, right.path));
  }, [snap.design.tokens, domain]);
  const ctx = viewportEditContext({
    breakpoints: activeBreakpoints(snap.design.settings.breakpoints),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const writingId = ctx.writingBreakpointId;
  const colorTokens = useMemo(() => colorTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const shadowTokens = useMemo(() => shadowTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const typographyCatalogs = useMemo<TypographyCatalogs>(
    () => ({
      fontRefs: projectFontRefs(snap.design.fonts),
      fontFamilyTokens: fontFamilyTokenRefs(snap.design.tokens),
      fontWeights: projectFontWeightOptions(snap.design.fonts),
      fontWeightTokens: fontWeightTokenRefs(snap.design.tokens),
      dimensionTokens: dimensionTokenRefs(snap.design.tokens),
      numberTokens: numberTokenRefs(snap.design.tokens),
    }),
    [snap.design.fonts, snap.design.tokens],
  );
  const tableTokens = useMemo<TableToken[]>(
    () =>
      tokens.map((token) => {
        const override = writingId ? token.breakpoints[writingId] : undefined;
        const baseValue = writingId
          ? effectiveBreakpointValue(
              token.value,
              token.breakpoints,
              writingId,
              ctx.breakpoints,
              true,
              token.type,
            )
          : token.value;
        const effectiveValue = writingId
          ? effectiveBreakpointValue(
              token.value,
              token.breakpoints,
              writingId,
              ctx.breakpoints,
              false,
              token.type,
            )
          : token.value;
        return {
          path: token.path,
          label: token.label,
          type: token.type,
          value: token.value,
          baseValue,
          effectiveValue,
          override,
          breakpoints: token.breakpoints,
          inherited: Boolean(writingId && override === undefined),
          deprecated: token.deprecated,
        };
      }),
    [tokens, writingId, ctx.breakpoints],
  );
  const visible = tableTokens.filter((token) =>
    tokenMatchesQuery(
      {
        path: `${tokenLeafLabel(token.path)} ${tokenTitle(token.path)} ${token.path}`,
        label: tokenDisplayLabel(token.path, token.label),
        valueText: `${formatTokenValue(token.effectiveValue)} ${resolve(`{${token.path}}`) ?? ''}`,
      },
      query,
    ),
  );
  const groups = groupTokens(visible);
  const domainTitle = designDomainLabel(domain);
  const writing = ctx.breakpoints.find((item) => item.id === writingId);
  return (
    <div className="stack design-domain-panel">
      <ViewportTabs
        session={session}
        breakpoints={ctx.breakpoints}
        baseId={ctx.base?.id ?? null}
        writingId={writingId}
      />
      <TokenTableToolbar
        query={query}
        onQueryChange={setQuery}
        count={visible.length}
        total={tableTokens.length}
        context={writing ? `${domainTitle} overrides at ${breakpointLabel(writing)}` : undefined}
        addAction={
          <>
            {domain === 'colors' ? <ColorTokenAddRow session={session} snap={snap} /> : null}
            {domain === 'spacing' ? <SpacingTokenAddRow session={session} snap={snap} /> : null}
            {domain === 'radius' ? <RadiusTokenAddRow session={session} snap={snap} /> : null}
            {domain === 'shadow' ? <ShadowTokenAddRow session={session} snap={snap} /> : null}
            {domain === 'typography' ? (
              <TypographyTokenAddRow session={session} snap={snap} />
            ) : null}
          </>
        }
      />
      {visible.length === 0 ? (
        <p className="inspector-empty">
          {tableTokens.length
            ? 'No tokens match the search.'
            : `No ${domainTitle.toLowerCase()} tokens.`}
        </p>
      ) : (
        <TokenTable>
          {groups.map((group) => {
            const open = !collapsedGroups.has(group.path);
            return (
              <TokenTableGroup
                key={group.path}
                path={group.path}
                label={tokenTitle(group.path)}
                count={group.tokens.length}
                open={open}
                onToggle={() =>
                  setCollapsedGroups((current) => {
                    const next = new Set(current);
                    if (next.has(group.path)) next.delete(group.path);
                    else next.add(group.path);
                    return next;
                  })
                }
              >
                {group.tokens.map((token) => (
                  <TokenTableRow
                    key={token.path}
                    session={session}
                    snap={snap}
                    token={token}
                    writingId={writingId}
                    ctx={ctx}
                    colorTokens={colorTokens}
                    shadowTokens={shadowTokens}
                    typographyCatalogs={typographyCatalogs}
                    showType={domain === 'typography'}
                  />
                ))}
              </TokenTableGroup>
            );
          })}
        </TokenTable>
      )}
    </div>
  );
}
