import type { DesignTokenSet } from '@facadeur/domain';
import { colors } from './tokens/colors';
import { fonts } from './tokens/fonts';
import { radius } from './tokens/radius';
import { shadows } from './tokens/shadows';
import { spacing } from './tokens/spacing';
import { typography } from './tokens/typography';

export const tokens = {
  color: colors,
  space: spacing,
  radius,
  shadow: shadows,
  type: typography,
  font: fonts,
} satisfies DesignTokenSet;
