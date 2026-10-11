/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds, tokenRef } from '@facadeur/examples';
import { readTokenTree, setTokenInTree, type JsonValue, type TokenTree } from '@facadeur/core';
import {
  withTokenBreakpoint,
  withTokenLabel,
  withTokenValue,
} from '../src/domain/edits/token-edit';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { TokenPreviewProvider, useTokenLabel } from '../src/ui/controls/fields/TokenPreviewContext';
import { TokensDomainPanel } from '../src/ui/design/tokens/TokensDomainPanel';
import { tokenAtPath } from './fixtures/token-tree';

type TokenDomain = 'colors' | 'spacing' | 'radius' | 'shadow' | 'typography';

function TokenLabelProbe({ uuid }: { uuid: string }) {
  const label = useTokenLabel();
  return <output data-testid="token-label">{label(tokenRef(uuid))}</output>;
}

function TokenTable({ session, domain }: { session: EditorSession; domain: TokenDomain }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return (
    <TokenPreviewProvider
      design={snap.design}
      document={snap.design}
      breakpointId={null}
      breakpoints={snap.design.breakpoints}
    >
      <TokensDomainPanel session={session} snap={snap} domain={domain} />
      <TokenLabelProbe uuid={exampleIds.tokens.space.scale.step4} />
    </TokenPreviewProvider>
  );
}

function submitToken(view: ReturnType<typeof render>, family: string, label: string) {
  if (!document.querySelector(`input[name="new-${family}-label"]`)) {
    fireEvent.click(view.container.querySelector(`button[name="add-${family}-token"]`)!);
  }
  fireEvent.change(document.querySelector(`input[name="new-${family}-label"]`)!, {
    target: { value: label },
  });
  fireEvent.click(document.querySelector(`button[name="add-${family}-token-submit"]`)!);
}

function catalogWithReference(family: 'radius' | 'shadow' | 'type', targetUuid: string) {
  const catalog = createExampleCatalog();
  const aliasUuid =
    family === 'radius'
      ? '00000000-0000-4000-8000-000000000031'
      : family === 'shadow'
        ? '00000000-0000-4000-8000-000000000032'
        : '00000000-0000-4000-8000-000000000035';
  const alias = {
    uuid: aliasUuid,
    label: 'Alias',
    group: '',
    valueType: family === 'radius' ? 'dimension' : family === 'shadow' ? 'shadow' : 'typography',
    value: tokenRef(targetUuid),
  };
  if (family === 'radius') {
    return {
      ...catalog,
      tokens: { ...catalog.tokens!, radius: { ...catalog.tokens!.radius, [aliasUuid]: alias } },
    };
  }
  if (family === 'shadow') {
    return {
      ...catalog,
      tokens: { ...catalog.tokens!, shadow: { ...catalog.tokens!.shadow, [aliasUuid]: alias } },
    };
  }
  return {
    ...catalog,
    tokens: { ...catalog.tokens!, type: { ...catalog.tokens!.type, [aliasUuid]: alias } },
  };
}

describe('design token tables', () => {
  let session: EditorSession | null = null;

  afterEach(() => {
    cleanup();
    session?.destroy();
    session = null;
  });

  function openDomain(domain: TokenDomain, projectCatalog = createExampleCatalog()) {
    session = createEditorSession({ projectCatalog });
    return render(<TokenTable session={session} domain={domain} />);
  }

  it('sorts numeric token paths naturally and searches names and values', () => {
    const view = openDomain('spacing');
    const paths = [...view.container.querySelectorAll<HTMLElement>('tr[data-token-path]')].map(
      (row) => row.dataset.tokenPath,
    );
    expect(paths.slice(0, 7)).toEqual([
      'space.0',
      'space.1',
      'space.2',
      'space.3',
      'space.4',
      'space.5',
      'space.6',
    ]);

    fireEvent.change(view.container.querySelector('input[name="token-filter"]')!, {
      target: { value: '16px' },
    });
    expect(view.container.querySelector('tr[data-token-path="space.4"]')).not.toBeNull();
    expect(view.container.querySelector('tr[data-token-path="space.5"]')).toBeNull();
  });

  it('adds a token through the compact popover action', () => {
    const view = openDomain('colors');
    submitToken(view, 'color', 'Brand highlight');

    const added = [...readTokenTree(session!.getSnapshot().design.tokens).tokens.values()].find(
      (token) => token.label === 'Highlight' && token.group === 'brand',
    );
    expect(added).toMatchObject({ type: 'color', value: '#000000' });
    expect(view.container.querySelector(`tr[data-token-path="${added?.path}"]`)).not.toBeNull();
  });

  it('keeps a referenced color token and reports why removal is blocked', () => {
    const view = openDomain('colors');
    fireEvent.click(
      view.container.querySelector(
        `button[name="remove-color-${exampleIds.tokens.color.blue._500}"]`,
      )!,
    );

    expect(tokenAtPath(session!.getSnapshot().design.tokens, 'color.blue.500')).toBeDefined();
    expect(session!.getSnapshot().notice).toMatchObject({ tone: 'error' });
    expect(session!.getSnapshot().notice?.text).toContain(exampleIds.tokens.color.blue._500);
    expect(session!.getSnapshot().notice?.text).toContain('color.accent.Default');
  });

  it('rejects an empty color label', () => {
    const view = openDomain('colors');
    submitToken(view, 'color', '   ');

    expect(
      tokenAtPath(session!.getSnapshot().design.tokens, 'color.brand.highlight'),
    ).toBeUndefined();
    expect(session!.getSnapshot().notice).toMatchObject({ tone: 'error' });
    expect(session!.getSnapshot().notice?.text).toMatch(/label is required/i);
  });

  it('suffixes a generated color path when the label collides', () => {
    const view = openDomain('colors');
    submitToken(view, 'color', 'Accent default');

    expect(
      tokenAtPath(session!.getSnapshot().design.tokens, 'color.accent.Default2'),
    ).toMatchObject({ type: 'color' });
    expect(session!.getSnapshot().notice?.tone).not.toBe('error');
    expect(
      view.container.querySelector('tr[data-token-path="color.accent.Default2"]'),
    ).not.toBeNull();
  });

  it('keeps token labels synchronized with direct and external Catalog updates', () => {
    const view = openDomain('spacing');
    const uuid = exampleIds.tokens.space.scale.step4;
    const inputFor = () =>
      view.container.querySelector<HTMLInputElement>(`input[name="token-label-${uuid}"]`)!;
    const labelOf = () =>
      readTokenTree(session!.getSnapshot().design.tokens).tokens.get(uuid)?.label;

    const input = inputFor();
    input.focus();
    fireEvent.change(input, { target: { value: 'Comfortable' } });
    fireEvent.blur(input);
    expect(labelOf()).toBe('Comfortable');
    expect(inputFor().value).toBe('Comfortable');

    const tokens = session!.getSnapshot().design.tokens as TokenTree;
    act(() => {
      session!.executeDesign({
        type: 'setToken',
        family: 'space',
        token: withTokenLabel(tokens, 'space', exampleIds.tokens.space.scale.step4, 'Remote label'),
      });
    });
    expect(inputFor().value).toBe('Remote label');
    expect(labelOf()).toBe('Remote label');
  });

  it('shows labels for token references in typography and shadow summaries', () => {
    const view = openDomain('typography');
    let tokens = session!.getSnapshot().design.tokens as TokenTree;
    tokens = setTokenInTree(
      tokens,
      'space',
      withTokenLabel(tokens, 'space', exampleIds.tokens.space.scale.step4, 'Comfortable'),
    );
    const body = tokenAtPath(tokens, 'type.Body')?.value as Record<string, JsonValue>;
    tokens = setTokenInTree(
      tokens,
      'type',
      withTokenValue(tokens, 'type', exampleIds.tokens.type.body, {
        ...body,
        fontSize: tokenRef(exampleIds.tokens.space.scale.step4),
      }),
    );
    const shadow = tokenAtPath(tokens, 'shadow.Md')?.value as Record<string, JsonValue>;
    tokens = setTokenInTree(
      tokens,
      'shadow',
      withTokenValue(tokens, 'shadow', exampleIds.tokens.shadow.md, {
        ...shadow,
        offsetX: tokenRef(exampleIds.tokens.space.scale.step4),
      }),
    );
    act(() => {
      session!.executeDesign({
        type: 'setToken',
        family: 'space',
        token: tokens.space[exampleIds.tokens.space.scale.step4]!,
      });
      session!.executeDesign({
        type: 'setToken',
        family: 'type',
        token: tokens.type[exampleIds.tokens.type.body]!,
      });
      session!.executeDesign({
        type: 'setToken',
        family: 'shadow',
        token: tokens.shadow[exampleIds.tokens.shadow.md]!,
      });
    });
    expect(tokenAtPath(session!.getSnapshot().design.tokens, 'type.Body')?.value).toMatchObject({
      fontSize: tokenRef(exampleIds.tokens.space.scale.step4),
    });
    expect(view.getByTestId('token-label').textContent).toContain('Comfortable');

    const typographySummary = view.container.querySelector(
      'tr[data-token-path="type.Body"] .design-typography-editor summary .meta',
    );
    expect(typographySummary?.textContent).toContain('Comfortable');
    expect(typographySummary?.textContent).not.toContain(
      tokenRef(exampleIds.tokens.space.scale.step4),
    );
    expect(tokenAtPath(session!.getSnapshot().design.tokens, 'type.Body')?.value).toMatchObject({
      fontSize: tokenRef(exampleIds.tokens.space.scale.step4),
    });

    view.rerender(<TokenTable session={session!} domain="shadow" />);
    const shadowSummary = view.container.querySelector(
      'tr[data-token-path="shadow.Md"] .design-shadow-editor summary .meta',
    );
    expect(shadowSummary?.textContent).toContain('Comfortable');
    expect(shadowSummary?.textContent).not.toContain(tokenRef(exampleIds.tokens.space.scale.step4));
    expect(tokenAtPath(session!.getSnapshot().design.tokens, 'shadow.Md')?.value).toMatchObject({
      offsetX: tokenRef(exampleIds.tokens.space.scale.step4),
    });
  });

  it.each([
    {
      domain: 'radius' as const,
      family: 'radius',
      label: 'Corner xl',
      path: 'radius.corner.Xl',
      value: '8px',
      existingPath: 'radius.Sm',
      collisionLabel: 'Md',
      collisionPath: 'radius.Md2',
    },
    {
      domain: 'spacing' as const,
      family: 'space',
      label: 'Gap xl',
      path: 'space.gap.Xl',
      value: '16px',
      existingPath: 'space.4',
      collisionLabel: 'Gap md',
      collisionPath: 'space.gap.Md2',
    },
    {
      domain: 'shadow' as const,
      family: 'shadow',
      label: 'Elevated xl',
      path: 'shadow.elevated.Xl',
      value: {
        offsetX: '0px',
        offsetY: '1px',
        blur: '2px',
        spread: '0px',
        color: '#00000014',
      },
      existingPath: 'shadow.Md',
      collisionLabel: 'Md',
      collisionPath: 'shadow.Md2',
    },
    {
      domain: 'typography' as const,
      family: 'type',
      label: 'Hero',
      path: 'type.Hero',
      value: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontWeight: 400,
        letterSpacing: '0',
        lineHeight: 1.5,
      },
      existingPath: 'type.Body',
      collisionLabel: 'Body',
      collisionPath: 'type.Body2',
    },
  ])('$domain token CRUD uses current Catalog records and paths', (scenario) => {
    const projectCatalog =
      scenario.family === 'radius' || scenario.family === 'shadow' || scenario.family === 'type'
        ? catalogWithReference(
            scenario.family,
            tokenAtPath(createExampleCatalog().tokens, scenario.existingPath)!.uuid,
          )
        : createExampleCatalog();
    const view = openDomain(scenario.domain, projectCatalog);
    submitToken(view, scenario.family, scenario.label);

    expect(tokenAtPath(session!.getSnapshot().design.tokens, scenario.path)).toMatchObject({
      value: scenario.value,
    });
    expect(view.container.querySelector(`tr[data-token-path="${scenario.path}"]`)).not.toBeNull();

    const existing = tokenAtPath(session!.getSnapshot().design.tokens, scenario.existingPath)!;
    fireEvent.click(
      view.container.querySelector(`button[name="remove-${scenario.family}-${existing.uuid}"]`)!,
    );
    expect(tokenAtPath(session!.getSnapshot().design.tokens, scenario.existingPath)).toBeDefined();
    expect(session!.getSnapshot().notice).toMatchObject({ tone: 'error' });

    submitToken(view, scenario.family, '   ');
    expect(session!.getSnapshot().notice?.text).toMatch(/label is required/i);

    submitToken(view, scenario.family, scenario.collisionLabel);
    expect(tokenAtPath(session!.getSnapshot().design.tokens, scenario.collisionPath)).toBeDefined();
    expect(session!.getSnapshot().notice?.tone).not.toBe('error');
  });

  it.each([
    {
      domain: 'radius' as const,
      family: 'radius',
      uuid: exampleIds.tokens.radius.lg,
      path: 'radius.lg',
      override: '20px',
      base: '12px',
    },
    {
      domain: 'spacing' as const,
      family: 'space',
      uuid: exampleIds.tokens.space.scale.step5,
      path: 'space.5',
      override: '28px',
      base: '20px',
    },
    {
      domain: 'shadow' as const,
      family: 'shadow',
      uuid: exampleIds.tokens.shadow.lg,
      path: 'shadow.lg',
      override: {
        blur: '40px',
        color: '#0f172a29',
        offsetX: '0px',
        offsetY: '20px',
        spread: '0px',
      },
      base: { offsetY: '16px' },
    },
    {
      domain: 'typography' as const,
      family: 'type',
      uuid: exampleIds.tokens.type.title,
      path: 'type.title',
      override: {
        fontFamily: tokenRef(exampleIds.tokens.font.inter),
        fontSize: '20px',
        fontWeight: 500,
        lineHeight: 1.4,
        letterSpacing: '0',
      },
      base: { fontSize: '24px' },
    },
  ])('$domain breakpoint override can be reset', (scenario) => {
    session = createEditorSession({ projectCatalog: createExampleCatalog() });
    session.executeDesign({
      type: 'setToken',
      family: scenario.family,
      token: withTokenBreakpoint(
        session.getSnapshot().design.tokens,
        scenario.family,
        scenario.uuid,
        exampleIds.catalog.breakpoints.tablet,
        scenario.override,
      ),
    });
    const view = render(<TokenTable session={session} domain={scenario.domain} />);
    act(() => {
      session!.setFocusViewport(exampleIds.catalog.breakpoints.tablet);
      session!.setEditTarget('viewport');
    });

    const title =
      scenario.domain === 'typography'
        ? 'Typography'
        : scenario.domain === 'spacing'
          ? 'Spacing'
          : scenario.domain === 'radius'
            ? 'Radius'
            : 'Shadow';
    expect(view.container.textContent).toContain(`${title} overrides at Tablet`);
    expect(
      readTokenTree(session.getSnapshot().design.tokens).tokens.get(scenario.uuid)?.breakpoints[
        exampleIds.catalog.breakpoints.tablet
      ],
    ).toEqual(scenario.override);
    fireEvent.click(
      view.container.querySelector(`button[name="reset-token-override-${scenario.uuid}"]`)!,
    );
    expect(
      readTokenTree(session.getSnapshot().design.tokens).tokens.get(scenario.uuid)?.breakpoints[
        exampleIds.catalog.breakpoints.tablet
      ],
    ).toBeUndefined();
    expect(
      readTokenTree(session.getSnapshot().design.tokens).tokens.get(scenario.uuid)?.value,
    ).toMatchObject(scenario.base);
  });

  it('edits a typography field on the selected tablet breakpoint', () => {
    const view = openDomain('typography');
    fireEvent.click(
      view.container.querySelector(
        `[data-viewport-tab="${exampleIds.catalog.breakpoints.tablet}"]`,
      )!,
    );
    const size = view.container.querySelector<HTMLInputElement>(
      `input[name="token-${exampleIds.tokens.type.body}-fontSize"]`,
    );
    expect(size?.value).toBe('17px');
    fireEvent.change(size!, { target: { value: '19px' } });
    fireEvent.blur(size!);

    expect(
      readTokenTree(session!.getSnapshot().design.tokens).tokens.get(exampleIds.tokens.type.body)
        ?.breakpoints[exampleIds.catalog.breakpoints.tablet],
    ).toEqual({ fontSize: '19px' });
  });
});
