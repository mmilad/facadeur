import { describe, expect, it } from 'vitest';
import { draftFromSchema, schemaFromDraft } from '../src/ui/schema/editor/schema';

describe('schema editor resource references', () => {
  it('writes a typed reference annotation while keeping the field a string', () => {
    const schema = { type: 'string', title: 'Icon preset ID', default: 'save' };
    const draft = draftFromSchema('icon', schema, false);

    expect(schemaFromDraft({ ...draft, referenceTarget: 'icon' }, schema)).toEqual({
      type: 'string',
      title: 'Icon preset ID',
      default: 'save',
      'x-facadeur-reference': { target: 'icon' },
      description: undefined,
    });
  });

  it('removes the reference annotation when the target is cleared', () => {
    const schema = {
      type: 'string',
      'x-facadeur-reference': { target: 'icon' },
    };
    const draft = draftFromSchema('icon', schema, false);

    expect(schemaFromDraft({ ...draft, referenceTarget: '' }, schema)).not.toHaveProperty(
      'x-facadeur-reference',
    );
  });
});
