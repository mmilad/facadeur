import type { ProjectCatalog } from '@facadeur/domain';

export const tokens = {
  color: {
    $extensions: {
      facadeur: {
        tier: 'primitive',
      },
    },
    $type: 'color',
    accent: {
      $extensions: {
        facadeur: {
          tier: 'semantic',
        },
      },
      default: {
        $value: '{color.blue.500}',
      },
      hover: {
        $value: '{color.blue.600}',
      },
    },
    bg: {
      $extensions: {
        facadeur: {
          tier: 'semantic',
        },
      },
      canvas: {
        $value: '{color.neutral.0}',
      },
      inverse: {
        $value: '{color.neutral.900}',
      },
      muted: {
        $value: '{color.neutral.50}',
      },
    },
    blue: {
      '500': {
        $value: '#2563eb',
      },
      '600': {
        $value: '#1d4ed8',
      },
    },
    border: {
      $extensions: {
        facadeur: {
          tier: 'semantic',
        },
      },
      default: {
        $value: '{color.neutral.200}',
      },
    },
    danger: {
      $extensions: {
        facadeur: {
          tier: 'semantic',
        },
      },
      default: {
        $value: '{color.red.500}',
      },
    },
    green: {
      '600': {
        $value: '#16a34a',
      },
    },
    neutral: {
      '0': {
        $value: '#ffffff',
      },
      '50': {
        $value: '#f8fafc',
      },
      '100': {
        $value: '#f1f5f9',
      },
      '200': {
        $value: '#e2e8f0',
      },
      '400': {
        $value: '#94a3b8',
      },
      '600': {
        $value: '#475569',
      },
      '900': {
        $value: '#0f172a',
      },
    },
    red: {
      '500': {
        $value: '#dc2626',
      },
    },
    success: {
      $extensions: {
        facadeur: {
          tier: 'semantic',
        },
      },
      default: {
        $value: '{color.green.600}',
      },
    },
    text: {
      $extensions: {
        facadeur: {
          tier: 'semantic',
        },
      },
      inverse: {
        $value: '{color.neutral.0}',
      },
      primary: {
        $value: '{color.neutral.900}',
      },
      secondary: {
        $value: '{color.neutral.600}',
      },
    },
  },
  radius: {
    $extensions: {
      facadeur: {
        tier: 'primitive',
      },
    },
    $type: 'dimension',
    full: {
      $value: '999px',
    },
    lg: {
      $value: '12px',
    },
    md: {
      $value: '8px',
    },
    none: {
      $value: '0',
    },
    sm: {
      $value: '4px',
    },
    xl: {
      $value: '16px',
    },
  },
  shadow: {
    $extensions: {
      facadeur: {
        tier: 'primitive',
      },
    },
    $type: 'shadow',
    lg: {
      $value: {
        blur: '40px',
        color: '#0f172a29',
        offsetX: '0px',
        offsetY: '16px',
        spread: '0px',
      },
    },
    md: {
      $value: {
        blur: '24px',
        color: '#0f172a1f',
        offsetX: '0px',
        offsetY: '8px',
        spread: '0px',
      },
    },
    sm: {
      $value: {
        blur: '2px',
        color: '#0f172a14',
        offsetX: '0px',
        offsetY: '1px',
        spread: '0px',
      },
    },
  },
  space: {
    '0': {
      $value: '0',
    },
    '1': {
      $value: '4px',
    },
    '2': {
      $value: '8px',
    },
    '3': {
      $value: '12px',
    },
    '4': {
      $value: '16px',
    },
    '5': {
      $value: '20px',
    },
    '6': {
      $value: '24px',
    },
    '8': {
      $value: '32px',
    },
    '10': {
      $value: '40px',
    },
    '12': {
      $value: '48px',
    },
    '16': {
      $value: '64px',
    },
    '20': {
      $value: '80px',
    },
    '24': {
      $value: '96px',
    },
    $description:
      '4px spacing grid. gap, padding, and margin use space.gap, space.inset, and space.stack.',
    $extensions: {
      facadeur: {
        tier: 'primitive',
      },
    },
    $type: 'dimension',
    gap: {
      $extensions: {
        facadeur: {
          tier: 'semantic',
        },
      },
      lg: {
        $value: '{space.6}',
      },
      md: {
        $value: '{space.4}',
      },
      sm: {
        $value: '{space.2}',
      },
      xs: {
        $value: '{space.1}',
      },
    },
    inset: {
      $extensions: {
        facadeur: {
          tier: 'semantic',
        },
      },
      lg: {
        $value: '{space.6}',
      },
      md: {
        $value: '{space.4}',
      },
      sm: {
        $value: '{space.3}',
      },
      xs: {
        $value: '{space.2}',
      },
    },
    stack: {
      $extensions: {
        facadeur: {
          tier: 'semantic',
        },
      },
      lg: {
        $value: '{space.8}',
      },
      md: {
        $value: '{space.4}',
      },
      sm: {
        $value: '{space.2}',
      },
      xs: {
        $value: '{space.1}',
      },
    },
  },
  type: {
    $extensions: {
      facadeur: {
        tier: 'semantic',
      },
    },
    $type: 'typography',
    body: {
      $extensions: {
        facadeur: {
          breakpoints: {
            xl: {
              fontSize: '18px',
            },
            sm: {
              fontSize: '17px',
            },
          },
        },
      },
      $value: {
        fontFamily: '{font.sans}',
        fontSize: '16px',
        fontWeight: 400,
        letterSpacing: '0',
        lineHeight: 1.5,
      },
    },
    caption: {
      $extensions: {
        facadeur: {
          breakpoints: {
            xl: {
              fontSize: '13px',
            },
          },
        },
      },
      $value: {
        fontFamily: '{font.sans}',
        fontSize: '12px',
        fontWeight: 400,
        letterSpacing: '0',
        lineHeight: 1.4,
      },
    },
    display: {
      $extensions: {
        facadeur: {
          breakpoints: {
            xl: {
              fontSize: '56px',
            },
            sm: {
              fontSize: '48px',
            },
          },
        },
      },
      $value: {
        fontFamily: '{font.sans}',
        fontSize: '40px',
        fontWeight: 600,
        letterSpacing: '0',
        lineHeight: 1.1,
      },
    },
    heading: {
      $extensions: {
        facadeur: {
          breakpoints: {
            xl: {
              fontSize: '40px',
            },
            sm: {
              fontSize: '36px',
            },
          },
        },
      },
      $value: {
        fontFamily: '{font.sans}',
        fontSize: '32px',
        fontWeight: 600,
        letterSpacing: '0',
        lineHeight: 1.2,
      },
    },
    label: {
      $extensions: {
        facadeur: {
          breakpoints: {
            xl: {
              fontSize: '15px',
            },
          },
        },
      },
      $value: {
        fontFamily: '{font.sans}',
        fontSize: '14px',
        fontWeight: 500,
        letterSpacing: '0',
        lineHeight: 1.4,
      },
    },
    title: {
      $extensions: {
        facadeur: {
          breakpoints: {
            xl: {
              fontSize: '28px',
            },
            sm: {
              fontSize: '26px',
            },
          },
        },
      },
      $value: {
        fontFamily: '{font.sans}',
        fontSize: '24px',
        fontWeight: 600,
        letterSpacing: '0',
        lineHeight: 1.25,
      },
    },
  },
} satisfies NonNullable<ProjectCatalog['tokens']>;
