import { describe, expect, it } from 'vitest';
import { formFieldsForSchema } from '../src/ui/schema/json-schema-form-config';

describe('JSON Schema form config', () => {
  it('uses the Core primary type rule for scalar schema type arrays', () => {
    expect(formFieldsForSchema({ type: ['integer', 'string'] }, 'Amount')).toEqual([
      { name: 'value', label: 'Amount', required: false, type: 'number', step: 1 },
    ]);
  });
});
