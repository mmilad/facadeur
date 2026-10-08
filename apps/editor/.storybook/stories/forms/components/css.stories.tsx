import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CssDeclarationsControl } from '../../../../src/ui/controls/generic/CssDeclarationsControl';

const meta = {
  title: 'Forms/Components/CSS',
  component: CssDeclarationsControl,
  args: {
    entries: [
      { property: 'display', value: 'grid', overridden: true },
      { property: 'gap', value: '16px', overridden: true },
      { property: 'padding', value: '24px', overridden: true },
      { property: 'color', value: '#3d5a80', overridden: true },
    ],
    declarationName: (property: string) => `css-${property}`,
    catalogs: {
      colorTokens: [],
      shadowTokens: [],
      typographyTokens: [],
      radiusTokens: [],
      dimensionTokens: [],
      typographyCatalogs: {
        fontRefs: [],
        fontFamilyTokens: [],
        fontWeightTokens: [],
        dimensionTokens: [],
        numberTokens: [],
      },
    },
    onCommitDeclaration: () => undefined,
    onPatchDeclarations: () => undefined,
    onAddDeclaration: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="eu-form" style={{ maxWidth: 520, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CssDeclarationsControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Declarations: Story = {};
