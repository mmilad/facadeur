import {
  breakpointLabel,
  readTokenTree,
  tokenReferenceValue,
  type DesignTokenFamily,
} from '@facadeur/core';
import { activeBreakpoints } from '@facadeur/tokens';
import { useEffect, useMemo, useState } from 'react';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontFamilies,
  fontWeightTokenRefs,
  numberTokenRefs,
  shadowTokenRefs,
} from '../../../domain/editing';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import { formatTokenValue } from '../../../domain/edits/token-edit';
import { viewportEditContext } from '../../../domain/viewport/viewport-edit';
import {
  projectFontRefs,
  projectFontWeightOptions,
  type TypographyCatalogs,
} from '../../controls/typography/index';
import type { DesignDomain } from '../design-domain';
import { designDomainLabel, tokenMatchesDomain } from '../design-domain';
import { Table } from '../../settings/Table';
import { ViewportTabs } from '../ViewportTabs';
import { TokenAddRow } from './TokenCrud';
import { effectiveBreakpointValue, groupTokens, type TableToken } from './token-breakpoint-helpers';
import { createTokenTableRow } from './token-table-row';
import { tokenLeafLabel, tokenTitle } from './token-labels';
import { tokenDisplayLabel } from '../../controls/token-presentation';
import {
  useTokenLabel,
  useTokenResolver,
  useTokenSearchValue,
} from '../../controls/fields/TokenPreviewContext';
import { naturalTokenCompare, tokenMatchesQuery } from './token-table-data';
import '../token-tables.css';

type TokenDomain = Exclude<DesignDomain, 'fonts' | 'icons' | 'viewports'>;

const DOMAIN_FAMILY: Record<TokenDomain, DesignTokenFamily> = {
  colors: 'color',
  spacing: 'space',
  radius: 'radius',
  shadow: 'shadow',
  typography: 'type',
};

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
  const labelFor = useTokenLabel();
  const searchValue = useTokenSearchValue();
  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [transformDrafts, setTransformDrafts] = useState<
    Record<string, { base: string; value: string }>
  >({});
  const tokens = useMemo(() => {
    const indexed = readTokenTree(snap.design.tokens);
    return [...indexed.tokens.values()]
      .filter((token) => token.family === DOMAIN_FAMILY[domain])
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
  const typographyCatalogs = useMemo<TypographyCatalogs>(() => {
    const fonts = fontFamilies(snap.design.tokens);
    return {
      fontRefs: projectFontRefs(fonts),
      fontFamilyTokens: fontFamilyTokenRefs(snap.design.tokens),
      fontWeights: projectFontWeightOptions(fonts),
      fontWeightTokens: fontWeightTokenRefs(snap.design.tokens),
      dimensionTokens: dimensionTokenRefs(snap.design.tokens),
      numberTokens: numberTokenRefs(snap.design.tokens),
    };
  }, [snap.design.tokens]);
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
          uuid: token.uuid,
          family: token.family,
          group: token.group,
          path: token.path,
          label: token.label,
          type: token.type,
          value: token.value,
          baseValue,
          effectiveValue,
          override,
          breakpoints: token.breakpoints,
          inherited: Boolean(writingId && override === undefined),
        };
      }),
    [tokens, writingId, ctx.breakpoints],
  );
  useEffect(() => {
    setTransformDrafts((current) => {
      let next: Record<string, { base: string; value: string }> | undefined;
      for (const [uuid, draft] of Object.entries(current)) {
        const token = tableTokens.find((item) => item.uuid === uuid);
        if (!token || formatTokenValue(token.effectiveValue) !== draft.base) {
          next ??= { ...current };
          delete next[uuid];
        }
      }
      return next ?? current;
    });
  }, [tableTokens]);
  const visible = tableTokens.filter((token) => {
    const reference = tokenReferenceValue(token.uuid);
    return tokenMatchesQuery(
      {
        path: `${tokenLeafLabel(token.path)} ${tokenTitle(token.path)} ${token.path}`,
        label: labelFor(reference),
        valueText: `${formatTokenValue(token.effectiveValue)} ${resolve(reference) ?? ''}`,
      },
      query,
    );
  });
  const groups = groupTokens(visible);
  const domainTitle = designDomainLabel(domain);
  const writing = ctx.breakpoints.find((item) => item.uuid === writingId);
  return (
    <div className="stack design-domain-panel">
      <ViewportTabs
        session={session}
        breakpoints={ctx.breakpoints}
        baseId={ctx.base?.uuid ?? null}
        writingId={writingId}
      />
      <Table
        id="token-filter"
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search tokens"
        searchPlaceholder="Search names or values"
        count={`${visible.length} of ${tableTokens.length} tokens`}
        columns={[
          { id: 'name', label: 'Name', width: '22%' },
          { id: 'preview', label: 'Preview', width: '14%' },
          { id: 'value', label: 'Value / reference', width: '54%' },
          { id: 'actions', ariaLabel: 'Actions', width: '10%' },
        ]}
        context={writing ? `${domainTitle} overrides at ${breakpointLabel(writing)}` : undefined}
        addAction={<TokenAddRow session={session} snap={snap} family={DOMAIN_FAMILY[domain]} />}
        emptyState={
          visible.length === 0 ? (
            <p className="inspector-empty">
              {tableTokens.length
                ? 'No tokens match the search.'
                : `No ${domainTitle.toLowerCase()} tokens.`}
            </p>
          ) : undefined
        }
        tableClassName="token-table"
        groups={groups.map((group) => {
          const open = !collapsedGroups.has(group.path);
          return {
            id: group.path,
            label: tokenTitle(group.path),
            open,
            onToggle: () =>
              setCollapsedGroups((current) => {
                const next = new Set(current);
                if (next.has(group.path)) next.delete(group.path);
                else next.add(group.path);
                return next;
              }),
            rows: group.tokens.map((token) =>
              createTokenTableRow({
                session,
                snap,
                token,
                writingId,
                ctx,
                colorTokens,
                shadowTokens,
                typographyCatalogs,
                showType: domain === 'typography',
                resolvePreview: resolve,
                labelFor,
                searchValue,
                transformDraft: transformDrafts[token.uuid],
                onTransform: () =>
                  setTransformDrafts((current) => ({
                    ...current,
                    [token.uuid]: { base: formatTokenValue(token.effectiveValue), value: '' },
                  })),
                onTransformValue: (next) =>
                  setTransformDrafts((current) => ({
                    ...current,
                    [token.uuid]: {
                      base: current[token.uuid]?.base ?? formatTokenValue(token.effectiveValue),
                      value: next,
                    },
                  })),
              }),
            ),
          };
        })}
      />
    </div>
  );
}
