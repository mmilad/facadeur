import type { Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import {
  componentInstance,
  colors,
  group,
  iconSource,
  leaf,
  row,
  smallText,
  uuid,
} from './facadeur-editor/shared';
import { facadeurComponentIds } from './facadeur-editor/components';

const emptySchema = {
  kind: 'inline',
  schema: { type: 'object', properties: {}, additionalProperties: false },
} as const;

function workspaceRoot(): Node {
  return {
    ...componentInstance(3901, 'Workspace shell instance', 360, {
      page: 'Sign in · Text field',
      selectedLayer: '▣  Input · selected',
      kind: 'FORM FIELD / INPUT',
      path: 'Components / Forms / Text field',
    }),
    uuid: uuid(3900),
    name: 'root',
  };
}

function settingsRoot(): Node {
  const categories = group(
    3920,
    'Settings categories',
    [
      leaf(3921, 'Settings title', 'Project settings', {
        fontSize: '13px',
        fontWeight: '650',
        marginBottom: '8px',
      }),
      componentInstance(3922, 'Viewports settings category', 370, {
        icon: iconSource('viewport'),
        label: 'Viewports',
      }),
      componentInstance(3923, 'Fonts settings category', 370, {
        icon: iconSource('typography'),
        label: 'Fonts',
      }),
      componentInstance(3924, 'Schemas settings category', 370, {
        icon: iconSource('schema'),
        label: 'Schemas',
      }),
      componentInstance(3925, 'Colors settings category', 370, {
        icon: iconSource('colors'),
        label: 'Colors',
      }),
      componentInstance(3926, 'Spacing settings category', 370, {
        icon: iconSource('spacing'),
        label: 'Spacing',
      }),
      componentInstance(3927, 'Shadow settings category', 370, {
        icon: iconSource('shadow'),
        label: 'Shadow',
      }),
      componentInstance(3928, 'Radius settings category', 370, {
        icon: iconSource('radius'),
        label: 'Radius',
      }),
      componentInstance(3929, 'Global styles selected category', 370, {
        icon: iconSource('global-styles'),
        label: 'Global styles',
        foreground: colors.accent,
        background: colors.accentSoft,
        fontWeight: '600',
      }),
    ],
    {
      display: 'flex',
      flexDirection: 'column',
      flex: '0 1 24%',
      minWidth: '0',
      borderRight: `1px solid ${colors.line}`,
      padding: '22px 14px',
      gap: '6px',
      backgroundColor: colors.paper,
    },
  );

  const header = group(
    3910,
    'Settings header',
    [
      leaf(3911, 'Back to workspace', '←  Workspace', {
        ...smallText,
        width: '100%',
        maxWidth: '130px',
      }),
      leaf(3912, 'Settings breadcrumb', 'Project settings  /  Global styles', {
        fontSize: '12px',
        fontWeight: '600',
        flex: '1',
        minWidth: '0',
      }),
      leaf(3913, 'Settings gear icon', '⚙', { color: colors.accent, fontSize: '16px' }),
    ],
    {
      ...row,
      minHeight: '58px',
      padding: '0 20px',
      backgroundColor: colors.paper,
      borderBottom: `1px solid ${colors.line}`,
    },
  );

  const content = group(
    3930,
    'Settings content',
    [
      categories,
      componentInstance(3931, 'Global styles table', facadeurComponentIds.globalStylesTable, {
        description:
          'Shared CSS rules applied across matching elements. Their source stays visible in the Inspector.',
      }),
    ],
    { ...row, alignItems: 'stretch', gap: '0' },
  );

  return group(3940, 'Facadeur settings root', [header, content], {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: '0',
    color: colors.ink,
    backgroundColor: colors.paper,
    fontFamily: 'Inter, ui-sans-serif, sans-serif',
    fontSize: '12px',
    overflow: 'hidden',
  });
}

function mobileWorkspaceRoot(): Node {
  const controls = group(
    3953,
    'Mobile panel controls',
    [
      leaf(3954, 'Layers drawer control', '☰  Layers', {
        flex: '1',
        padding: '10px',
        textAlign: 'center',
        border: `1px solid ${colors.line}`,
        borderRadius: '7px',
        color: colors.ink,
      }),
      leaf(3955, 'Inspector drawer control', '☷  Inspector', {
        flex: '1',
        padding: '10px',
        textAlign: 'center',
        border: `1px solid ${colors.line}`,
        borderRadius: '7px',
        color: colors.ink,
      }),
    ],
    { ...row, gap: '8px' },
  );
  const preview = group(
    3956,
    'Mobile canvas preview',
    [
      leaf(3957, 'Mobile preview eyebrow', 'ACCOUNT ACCESS', {
        fontSize: '10px',
        color: colors.accent,
        letterSpacing: '0.08em',
      }),
      leaf(3958, 'Mobile preview title', 'Welcome back', {
        color: colors.ink,
        fontSize: '24px',
        fontWeight: '650',
      }),
      leaf(3959, 'Mobile preview description', 'Sign in to continue to your workspace.', {
        ...smallText,
        fontSize: '13px',
      }),
      leaf(3960, 'Mobile email field', 'Work email   name@company.com', {
        ...smallText,
        padding: '12px',
        border: `1px solid ${colors.line}`,
        borderRadius: '7px',
      }),
      leaf(3961, 'Mobile password field', 'Password   ••••••••••', {
        ...smallText,
        padding: '12px',
        border: `1px solid ${colors.line}`,
        borderRadius: '7px',
      }),
      leaf(3962, 'Mobile continue button', 'Continue  →', {
        width: '100%',
        padding: '12px',
        textAlign: 'center',
        color: colors.paper,
        backgroundColor: colors.accent,
        borderRadius: '7px',
        fontWeight: '600',
      }),
    ],
    {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      width: '100%',
      padding: '20px',
      backgroundColor: colors.paper,
      border: `1px solid ${colors.line}`,
      borderRadius: '12px',
      boxShadow: '0 12px 30px rgba(25, 24, 31, 0.08)',
    },
  );
  const stage = group(3963, 'Mobile canvas stage', [preview], {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '1',
    width: '100%',
    minWidth: '0',
    minHeight: '360px',
    padding: '16px',
    backgroundColor: colors.canvas,
    backgroundImage: 'radial-gradient(#d8d6d2 1px, transparent 1px)',
    backgroundSize: '18px 18px',
  });
  const toolbar = group(
    3964,
    'Mobile canvas toolbar',
    [
      leaf(3965, 'Mobile viewport', 'Phone  ·  375 px', {
        ...smallText,
        padding: '7px 9px',
        border: `1px solid ${colors.line}`,
        borderRadius: '6px',
      }),
      leaf(3966, 'Mobile zoom', '−  100%  +', {
        ...smallText,
        padding: '7px 9px',
        border: `1px solid ${colors.line}`,
        borderRadius: '6px',
      }),
    ],
    { ...row, justifyContent: 'space-between', width: '100%' },
  );
  return group(
    3970,
    'Facadeur mobile workspace concept',
    [componentInstance(3949, 'Header', facadeurComponentIds.header), controls, toolbar, stage],
    {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      minWidth: '0',
      padding: '14px',
      color: colors.ink,
      backgroundColor: colors.paper,
      fontFamily: 'Inter, ui-sans-serif, sans-serif',
      fontSize: '12px',
      overflow: 'hidden',
    },
  );
}

export const facadeurWorkspace: NodeDefinition = {
  uuid: uuid(901),
  name: 'Facadeur workspace concept',
  kind: 'page',
  schema: emptySchema,
  root: workspaceRoot(),
};
export const facadeurSettings: NodeDefinition = {
  uuid: uuid(902),
  name: 'Facadeur settings concept',
  kind: 'page',
  schema: emptySchema,
  root: settingsRoot(),
};
export const facadeurWorkspaceMobile: NodeDefinition = {
  uuid: uuid(903),
  name: 'Facadeur workspace mobile concept',
  kind: 'page',
  schema: emptySchema,
  root: mobileWorkspaceRoot(),
};

export const facadeurDesignPages = {
  [facadeurWorkspace.uuid]: facadeurWorkspace,
  [facadeurSettings.uuid]: facadeurSettings,
  [facadeurWorkspaceMobile.uuid]: facadeurWorkspaceMobile,
} satisfies ProjectCatalog['pages'];
