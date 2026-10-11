import { describe, expect, it } from 'vitest';
import { fieldDisplayLabel } from '../../src/ui/controls/fields/field-label';

describe('field display labels', () => {
  it('humanizes field names without changing their stored keys', () => {
    expect(fieldDisplayLabel('hasIcon')).toBe('Show leading icon');
    expect(fieldDisplayLabel('control_value')).toBe('Control value');
  });
});
