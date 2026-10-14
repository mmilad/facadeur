import { defaultBreakpointIds } from '@facadeur/core/default-breakpoint-ids';
import type { StyleChildLayer } from '@facadeur/domain';
import {
  componentDefinition,
  colors,
  group,
  iconSource,
  image,
  leaf,
  row,
  smallText,
  uuid,
} from './shared';

const iconButton = (id: number, imageId: number, icon: string, label: string) => ({
  uuid: uuid(id),
  name: label,
  dom: {
    tagName: 'button',
    attributes: { type: 'button', 'aria-label': label },
    children: [
      image(imageId, `${label} icon`, iconSource(icon), { width: '18px', height: '18px' }),
    ],
  },
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    padding: '0',
    backgroundColor: colors.paper,
    border: `1px solid ${colors.line}`,
    borderRadius: '8px',
  },
});

export const facadeurHeaderStyleChildren = {
  [`${uuid(3102)}/${uuid(3104)}`]: {
    declarations: { display: 'none' },
    breakpoints: {
      [defaultBreakpointIds.laptop]: { declarations: { display: 'flex' } },
    },
  },
  [`${uuid(3108)}/${uuid(3109)}`]: {
    declarations: { display: 'none' },
    breakpoints: {
      [defaultBreakpointIds.laptop]: { declarations: { display: 'flex' } },
    },
  },
  [`${uuid(3108)}/${uuid(3112)}`]: {
    declarations: { display: 'flex' },
    breakpoints: {
      [defaultBreakpointIds.laptop]: { declarations: { display: 'none' } },
    },
  },
} satisfies Record<string, StyleChildLayer>;

export const facadeurHeader = componentDefinition(
  310,
  'Facadeur header',
  {},
  group(
    3101,
    'Header',
    [
      group(
        3102,
        'Header left',
        [
          leaf(3103, 'Brand', 'facadeur', {
            width: 'auto',
            fontSize: '15px',
            fontWeight: '700',
            color: colors.ink,
          }),
          group(
            3104,
            'Desktop project context',
            [
              leaf(3105, 'Project separator', '/', smallText),
              leaf(3106, 'Project name', 'Studio Kit', { ...smallText, color: colors.ink }),
              leaf(3107, 'Asset name', 'Text field', { ...smallText, color: colors.muted }),
            ],
            { ...row, width: 'auto', flex: '0 1 auto', minWidth: '0', overflow: 'hidden' },
          ),
        ],
        {
          ...row,
          width: 'auto',
          flex: '1 1 auto',
          minWidth: '0',
          gap: '16px',
        },
      ),
      group(
        3108,
        'Header right',
        [
          group(
            3109,
            'Desktop header actions',
            [
              iconButton(3110, 3111, 'save', 'Save project'),
              group(
                3119,
                'Desktop save status',
                [
                  image(3120, 'Saved icon', iconSource('saved'), {
                    width: '14px',
                    height: '14px',
                  }),
                  leaf(3121, 'Saved label', 'Saved', { color: colors.green, fontSize: '11px' }),
                ],
                { ...row, width: 'auto', gap: '4px' },
              ),
            ],
            { ...row, width: 'auto', gap: '10px' },
          ),
          group(
            3112,
            'Mobile header actions',
            [
              iconButton(3113, 3114, 'save', 'Save project'),
              iconButton(3115, 3116, 'menu', 'Open navigation menu'),
            ],
            { ...row, width: 'auto', gap: '8px' },
          ),
        ],
        { ...row, width: 'auto', flex: '0 0 auto', justifyContent: 'flex-end', gap: '10px' },
      ),
    ],
    {
      ...row,
      justifyContent: 'space-between',
      minHeight: '60px',
      padding: '0 14px',
      backgroundColor: colors.paper,
      borderBottom: `1px solid ${colors.line}`,
    },
  ),
);
