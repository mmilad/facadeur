import type { ProjectCatalog } from '@facadeur/domain';
import {
  componentDefinition,
  componentInstance,
  colors,
  group,
  iconSource,
  image,
  labelStyle,
  leaf,
  panel,
  prop,
  row,
  smallText,
  textProp,
} from './shared';
import { facadeurHeader } from './header';
import { facadeurTreeNode } from './tree-node';

const sidebarLeft = componentDefinition(
  320,
  'Facadeur left sidebar',
  {
    page: { type: 'string', default: 'Sign in · Text field' },
    selectedLayer: { type: 'string', default: 'Input · selected' },
  },
  group(
    3201,
    'Left sidebar',
    [
      group(
        3202,
        'Sidebar heading',
        [
          leaf(3203, 'Layers title', 'LAYERS', labelStyle),
          leaf(3204, 'Sidebar menu', '•••', smallText),
        ],
        { ...row, justifyContent: 'space-between' },
      ),
      leaf(3205, 'Sidebar help', 'Right-click a layer to insert, wrap, duplicate, or delete.', {
        ...smallText,
        lineHeight: '1.45',
      }),
      group(
        3206,
        'Layer tree',
        [
          leaf(3207, 'Page layer', '⌄  Text field', {
            padding: '8px',
            fontWeight: '600',
            fontSize: '12px',
          }),
          leaf(3208, 'Root layer', '　▱  root', {
            padding: '7px 8px',
            color: colors.muted,
            fontSize: '12px',
          }),
          leaf(3209, 'Form layer', '　⌄  form-control', {
            padding: '7px 8px',
            color: colors.ink,
            fontSize: '12px',
          }),
          leaf(3210, 'Label layer', '　　T  Work email', {
            padding: '7px 8px 7px 22px',
            fontSize: '12px',
          }),
          leaf(3211, 'Selected layer', textProp(3202), {
            padding: '8px 8px 8px 22px',
            color: colors.accent,
            backgroundColor: colors.accentSoft,
            borderRadius: '6px',
            fontSize: '12px',
          }),
          leaf(3212, 'Hint layer', '　　T  Helper text', {
            padding: '7px 8px 7px 22px',
            fontSize: '12px',
          }),
        ],
        { display: 'flex', flexDirection: 'column', gap: '2px' },
      ),
      group(
        3213,
        'Pages section',
        [
          leaf(3214, 'Pages label', 'PAGES', labelStyle),
          leaf(3215, 'Page item', textProp(3201), {
            padding: '8px',
            borderRadius: '6px',
            backgroundColor: colors.subtle,
            fontSize: '12px',
          }),
        ],
        { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' },
      ),
    ],
    {
      ...panel,
      flex: '0 1 20%',
      minWidth: '0',
      borderRight: `1px solid ${colors.line}`,
      padding: '18px 12px',
      gap: '14px',
    },
  ),
);

const sidebarRight = componentDefinition(
  330,
  'Facadeur right sidebar',
  {
    layer: { type: 'string', default: 'Input' },
    kind: { type: 'string', default: 'FORM FIELD / INPUT' },
  },
  group(
    3301,
    'Right sidebar',
    [
      group(
        3302,
        'Inspector identity',
        [
          group(
            3303,
            'Selected element',
            [
              leaf(3304, 'Selected name', textProp(3301), { fontSize: '14px', fontWeight: '650' }),
              leaf(3305, 'Selected kind', textProp(3302), labelStyle),
            ],
            { display: 'flex', flexDirection: 'column', gap: '5px' },
          ),
          leaf(3306, 'Inspector menu', '•••', { color: colors.muted }),
        ],
        { ...row, justifyContent: 'space-between' },
      ),
      group(
        3307,
        'Inspector tabs',
        [
          leaf(3308, 'Style tab', 'Style', {
            padding: '9px 3px',
            color: colors.accent,
            fontWeight: '650',
            fontSize: '12px',
            borderBottom: `2px solid ${colors.accent}`,
          }),
          leaf(3309, 'Content tab', 'Content', { ...smallText, padding: '9px 3px' }),
          leaf(3310, 'Responsive tab', 'Responsive', { ...smallText, padding: '9px 3px' }),
        ],
        { ...row, gap: '18px', borderBottom: `1px solid ${colors.line}` },
      ),
      group(
        3311,
        'Active classes',
        [
          leaf(3312, 'Classes label', 'ACTIVE CLASSES', labelStyle),
          leaf(3313, 'Class chip', '.field-control   ×', {
            padding: '6px 8px',
            color: colors.accent,
            backgroundColor: colors.accentSoft,
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '11px',
          }),
          leaf(3314, 'Class add', '+', {
            ...smallText,
            padding: '5px 8px',
            border: `1px solid ${colors.line}`,
            borderRadius: '6px',
          }),
        ],
        { ...row, flexWrap: 'wrap' },
      ),
      group(
        3315,
        'Local styles',
        [
          leaf(3316, 'Local label', 'ON THIS LAYER  ·  LOCAL', labelStyle),
          componentInstance(3317, 'Local display declaration', 350, {
            selector: 'display',
            property: 'display',
            value: 'flex',
            source: 'Local',
          }),
          componentInstance(3318, 'Local gap declaration', 350, {
            selector: 'gap',
            property: 'gap',
            value: '12px',
            source: 'Local',
          }),
          componentInstance(3319, 'Local border declaration', 350, {
            selector: 'border',
            property: 'border',
            value: 'none',
            source: 'Local',
          }),
          leaf(3320, 'Add property', '+  Add CSS property', {
            ...smallText,
            padding: '8px 0',
            textAlign: 'center',
            border: `1px dashed ${colors.line}`,
            borderRadius: '6px',
          }),
        ],
        { display: 'flex', flexDirection: 'column', gap: '2px' },
      ),
      group(
        3321,
        'Active class styles',
        [
          leaf(3322, 'Class styles label', 'ACTIVE CLASS  ·  .field-control', labelStyle),
          componentInstance(3323, 'Class padding declaration', 350, {
            selector: '.field-control',
            property: 'padding',
            value: '12px 14px',
            source: 'Active class',
          }),
        ],
        {
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          paddingTop: '8px',
          borderTop: `1px solid ${colors.line}`,
        },
      ),
      group(
        3324,
        'Inherited styles',
        [
          leaf(3325, 'Inherited label', 'INHERITED  ·  FROM .form-control', labelStyle),
          componentInstance(3326, 'Inherited font declaration', 350, {
            selector: '.form-control',
            property: 'font-family',
            value: 'Inter, sans-serif',
            source: 'Inherited',
          }),
        ],
        {
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          paddingTop: '8px',
          borderTop: `1px solid ${colors.line}`,
        },
      ),
      group(
        3327,
        'Global styles',
        [
          leaf(3328, 'Global label', 'GLOBAL  ·  SETTINGS', labelStyle),
          componentInstance(3329, 'Global color declaration', 350, {
            selector: '*',
            property: 'color',
            value: '#25242a',
            source: 'Global',
          }),
          leaf(3330, 'Source legend', 'Sources stay distinct; values show the winning rule.', {
            ...smallText,
            fontSize: '10px',
            lineHeight: '1.4',
          }),
        ],
        {
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          paddingTop: '8px',
          borderTop: `1px solid ${colors.line}`,
        },
      ),
    ],
    {
      ...panel,
      flex: '1 1 28%',
      minWidth: '0',
      borderLeft: `1px solid ${colors.line}`,
      overflow: 'hidden',
      padding: '18px 16px',
      gap: '12px',
    },
  ),
);

const canvas = componentDefinition(
  340,
  'Facadeur canvas',
  {
    asset: { type: 'string', default: 'Text field' },
    path: { type: 'string', default: 'Components / Forms / Text field' },
  },
  group(
    3401,
    'Canvas',
    [
      group(
        3402,
        'Canvas heading',
        [
          group(
            3403,
            'Canvas title block',
            [
              leaf(3404, 'Asset title', textProp(3401), { fontSize: '17px', fontWeight: '650' }),
              leaf(3405, 'Asset path', textProp(3402), smallText),
            ],
            { display: 'flex', flexDirection: 'column', gap: '4px' },
          ),
          leaf(3406, 'Canvas saved status', '●  Saved', { color: colors.green, fontSize: '11px' }),
        ],
        {
          ...row,
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: `1px solid ${colors.line}`,
        },
      ),
      group(
        3407,
        'Canvas toolbar',
        [
          leaf(3408, 'Viewport control', 'Desktop  ·  1200 px', {
            padding: '8px 10px',
            backgroundColor: colors.paper,
            border: `1px solid ${colors.line}`,
            borderRadius: '6px',
            fontSize: '11px',
          }),
          leaf(3409, 'Zoom control', '−　 100%　 +', {
            padding: '8px 10px',
            backgroundColor: colors.paper,
            border: `1px solid ${colors.line}`,
            borderRadius: '6px',
            fontSize: '11px',
          }),
        ],
        { ...row, justifyContent: 'space-between', padding: '12px 22px' },
      ),
      group(
        3410,
        'Canvas surface',
        [
          group(
            3411,
            'Sign-in preview',
            [
              leaf(3412, 'Preview eyebrow', 'ACCOUNT ACCESS', {
                ...labelStyle,
                color: colors.accent,
              }),
              leaf(3413, 'Preview title', 'Welcome back', {
                color: colors.ink,
                fontSize: '28px',
                fontWeight: '650',
              }),
              leaf(3414, 'Preview description', 'Sign in to continue to your workspace.', {
                ...smallText,
                fontSize: '14px',
              }),
              leaf(3415, 'Email field preview', 'Work email   name@company.com', {
                ...smallText,
                padding: '13px 14px',
                border: `1px solid ${colors.line}`,
                borderRadius: '7px',
              }),
              leaf(3416, 'Password field preview', 'Password   ••••••••••', {
                ...smallText,
                padding: '13px 14px',
                border: `1px solid ${colors.line}`,
                borderRadius: '7px',
              }),
              leaf(3417, 'Continue button', 'Continue  →', {
                padding: '13px',
                textAlign: 'center',
                color: colors.paper,
                backgroundColor: colors.accent,
                borderRadius: '7px',
                fontWeight: '600',
                fontSize: '13px',
              }),
            ],
            {
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
              maxWidth: '340px',
              padding: '28px',
              backgroundColor: colors.paper,
              border: `1px solid ${colors.line}`,
              borderRadius: '12px',
              boxShadow: '0 18px 50px rgba(25, 24, 31, 0.08)',
            },
          ),
        ],
        {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '1',
          minHeight: '560px',
          backgroundColor: colors.canvas,
          padding: '32px',
          backgroundImage: 'radial-gradient(#d8d6d2 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        },
      ),
    ],
    {
      display: 'flex',
      flexDirection: 'column',
      flex: '1 1 48%',
      minWidth: '0',
      backgroundColor: colors.subtle,
    },
  ),
);

const shell = componentDefinition(
  360,
  'Facadeur workspace shell',
  {
    page: { type: 'string', default: 'Sign in · Text field' },
    selectedLayer: { type: 'string', default: 'Input · selected' },
    kind: { type: 'string', default: 'FORM FIELD / INPUT' },
    path: { type: 'string', default: 'Components / Forms / Text field' },
  },
  group(
    3601,
    'Workspace shell',
    [
      componentInstance(3602, 'Application header', 310),
      group(
        3603,
        'Editor body',
        [
          group(
            3604,
            'App navigation',
            [
              leaf(3605, 'Brand mark', 'f', {
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.paper,
                backgroundColor: colors.accent,
                borderRadius: '10px',
                fontSize: '19px',
                fontWeight: '700',
              }),
              image(3606, 'Workspace nav icon', iconSource('workspace'), {
                marginTop: '24px',
                padding: '10px',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: colors.accentSoft,
              }),
              image(3607, 'Components nav icon', iconSource('components'), {
                padding: '10px',
                width: '36px',
                height: '36px',
              }),
              image(3608, 'Assets nav icon', iconSource('assets'), {
                padding: '10px',
                width: '36px',
                height: '36px',
              }),
              image(3609, 'Settings nav icon', iconSource('settings'), {
                marginTop: 'auto',
                padding: '10px',
                width: '36px',
                height: '36px',
              }),
            ],
            {
              ...panel,
              flex: '0 0 58px',
              alignItems: 'center',
              padding: '14px 8px',
              gap: '10px',
              borderRight: `1px solid ${colors.line}`,
            },
          ),
          componentInstance(3610, 'Left sidebar', 320),
          componentInstance(3611, 'Canvas', 340),
          componentInstance(3612, 'Right sidebar', 330),
        ],
        { ...row, flex: '1', alignItems: 'stretch', gap: '0', minHeight: '0' },
      ),
    ],
    {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      minWidth: '0',
      color: colors.ink,
      backgroundColor: colors.paper,
      fontFamily: 'Inter, ui-sans-serif, sans-serif',
      fontSize: '12px',
      overflow: 'hidden',
    },
  ),
);

const settingsCategory = componentDefinition(
  370,
  'Settings category item',
  {
    icon: { type: 'string', default: iconSource('viewport') },
    label: { type: 'string', default: 'Viewports' },
    foreground: { type: 'string', default: colors.muted },
    background: { type: 'string', default: colors.paper },
    fontWeight: { type: 'string', default: '500' },
  },
  group(
    3701,
    'Settings category item',
    [
      image(3702, 'Category icon', textProp(3701), { width: '16px', height: '16px' }),
      leaf(3703, 'Category label', textProp(3702), { flex: '1' }),
    ],
    {
      ...row,
      padding: '9px',
      borderRadius: '6px',
      color: textProp(3703),
      backgroundColor: textProp(3704),
      fontWeight: textProp(3705),
    },
  ),
);

const cssRule = componentDefinition(
  350,
  'CSS rule row',
  {
    selector: { type: 'string', default: '.form-control' },
    property: { type: 'string', default: 'color' },
    value: { type: 'string', default: '#25242a' },
    source: { type: 'string', default: 'Global' },
  },
  group(
    3501,
    'CSS rule row',
    [
      leaf(3502, 'CSS selector', textProp(3501), {
        fontFamily: 'monospace',
        color: colors.accent,
        fontSize: '11px',
        width: '28%',
      }),
      leaf(3503, 'CSS property', textProp(3502), {
        fontFamily: 'monospace',
        fontSize: '11px',
        flex: '1',
        minWidth: '0',
      }),
      leaf(3504, 'CSS value', textProp(3503), {
        fontFamily: 'monospace',
        fontSize: '11px',
        flex: '1',
        minWidth: '0',
      }),
      leaf(3505, 'CSS source', textProp(3504), {
        ...smallText,
        fontSize: '10px',
        textAlign: 'right',
      }),
    ],
    { ...row, minHeight: '48px', padding: '10px 0', borderBottom: `1px solid ${colors.line}` },
  ),
);

const globalStylesTable = componentDefinition(
  380,
  'Global CSS rules list',
  {
    description: { type: 'string', default: 'Shared CSS rules applied across matching elements.' },
  },
  group(
    3801,
    'Global CSS rules list',
    [
      leaf(3802, 'Global styles title', 'Global styles', { fontSize: '22px', fontWeight: '650' }),
      leaf(3803, 'Global styles description', textProp(3801), {
        ...smallText,
        fontSize: '13px',
        lineHeight: '1.5',
        maxWidth: '620px',
      }),
      group(
        3804,
        'CSS table header',
        [
          leaf(3805, 'Selector column', 'SELECTOR', labelStyle),
          leaf(3806, 'Property column', 'PROPERTY', { ...labelStyle, flex: '1' }),
          leaf(3807, 'Value column', 'VALUE', { ...labelStyle, flex: '1' }),
          leaf(3808, 'Source column', 'SOURCE', { ...labelStyle, textAlign: 'right' }),
        ],
        { ...row, padding: '12px 0', borderBottom: `1px solid ${colors.line}` },
      ),
      componentInstance(3809, 'Form-control color rule', 350, {
        selector: '.form-control',
        property: 'color',
        value: '#25242a',
        source: 'Global',
      }),
      componentInstance(3810, 'Form-control font rule', 350, {
        selector: '.form-control',
        property: 'font-family',
        value: 'Inter, sans-serif',
        source: 'Global',
      }),
      componentInstance(3811, 'Form-control border rule', 350, {
        selector: '.form-control',
        property: 'border-color',
        value: '#d7d4ce',
        source: 'Global',
      }),
      componentInstance(3812, 'Primary button background rule', 350, {
        selector: '.button-primary',
        property: 'background',
        value: '#6754d9',
        source: 'Global',
      }),
      componentInstance(3813, 'Primary button radius rule', 350, {
        selector: '.button-primary',
        property: 'border-radius',
        value: '7px',
        source: 'Global',
      }),
      leaf(3814, 'Add global rule', '+  Add global rule', {
        ...smallText,
        padding: '10px 0',
        textAlign: 'center',
        border: `1px dashed ${colors.line}`,
        borderRadius: '6px',
      }),
    ],
    {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: 'clamp(16px, 4vw, 42px)',
      flex: '1',
      minWidth: '0',
      backgroundColor: colors.paper,
    },
  ),
);

export const facadeurComponents = {
  header: facadeurHeader,
  treeNode: facadeurTreeNode,
  sidebarLeft,
  sidebarRight,
  canvas,
  shell,
  settingsCategory,
  cssRule,
  globalStylesTable,
};

export const facadeurComponentCatalog = Object.fromEntries(
  Object.values(facadeurComponents).map((definition) => [definition.uuid, definition]),
) satisfies ProjectCatalog['components'];

export const facadeurComponentIds = {
  header: facadeurHeader.uuid,
  treeNode: facadeurTreeNode.uuid,
  sidebarLeft: sidebarLeft.uuid,
  sidebarRight: sidebarRight.uuid,
  canvas: canvas.uuid,
  shell: shell.uuid,
  settingsCategory: settingsCategory.uuid,
  cssRule: cssRule.uuid,
  globalStylesTable: globalStylesTable.uuid,
  props: {
    page: prop(3201),
    selectedLayer: prop(3202),
    kind: prop(3302),
    path: prop(3402),
    description: prop(3801),
  },
};
