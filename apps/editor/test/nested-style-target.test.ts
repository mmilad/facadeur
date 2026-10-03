import { describe, expect, it } from 'vitest';
import { nestedInstanceStyleTarget } from '../src/domain/nested-selection/style-target';

describe('nested instance style target', () => {
  it('projects the rendered path relative to the owner document root', () => {
    expect(
      nestedInstanceStyleTarget(
        {
          ownerNodeId: 'sign-in',
          instancePath: 'continue',
          renderId: 'root/cards/card-row/sign-in/continue',
          node: { id: 'continue', type: 'instance', component: 'button' },
          document: {} as never,
        },
        'root',
      ),
    ).toBe('cards/card-row/sign-in/continue');
  });

  it('does not expose a style target for non-instance leaves', () => {
    expect(
      nestedInstanceStyleTarget(
        {
          ownerNodeId: 'sign-in',
          instancePath: '',
          renderId: 'root/sign-in/title',
          node: { id: 'title', type: 'text', text: 'Sign in' },
          document: {} as never,
        },
        'root',
      ),
    ).toBeNull();
  });

  it('keeps intermediate frame ids in the owner-relative render path', () => {
    expect(
      nestedInstanceStyleTarget(
        {
          ownerNodeId: 'sign-in',
          instancePath: 'continue',
          renderId: 'root/cards/card-row/sign-in/content/continue',
          node: { id: 'continue', type: 'instance', component: 'button' },
          document: {} as never,
        },
        'root',
      ),
    ).toBe('cards/card-row/sign-in/content/continue');
  });
});
