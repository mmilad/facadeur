import { expect, it } from 'vitest';
import { matchingSchemaIndex, type JsonSchema } from '../src/index.js';

const schemas: JsonSchema[] = [
  {
    type: 'object',
    properties: { title: { type: 'string' }, body: { type: 'string' } },
    additionalProperties: true,
  },
  {
    type: 'object',
    properties: { label: { type: 'string' }, placeholder: { type: 'string' } },
    additionalProperties: true,
  },
];

it('selects the schema describing supplied optional fields and preserves ordered ties', () => {
  expect(matchingSchemaIndex({ label: '', placeholder: '' }, schemas)).toBe(1);
  expect(matchingSchemaIndex({ label: 'Email' }, schemas)).toBe(1);
  expect(matchingSchemaIndex({ title: '' }, schemas)).toBe(0);
  expect(matchingSchemaIndex({}, schemas)).toBe(0);
  expect(matchingSchemaIndex({}, [schemas[1]!, schemas[0]!])).toBe(0);
  expect(matchingSchemaIndex('invalid', schemas)).toBe(-1);
});

it('recognizes properties in preserved union/allOf contracts without accepting invalid branches', () => {
  const wrapped: JsonSchema = { anyOf: [{ allOf: [schemas[1]!, { required: ['label'] }] }] };
  expect(matchingSchemaIndex({ label: '' }, [schemas[0]!, wrapped])).toBe(1);
  expect(matchingSchemaIndex({ placeholder: '' }, [schemas[0]!, wrapped])).toBe(0);
});
