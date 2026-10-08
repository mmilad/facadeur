/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthScreen } from '../src/ui/management/AuthScreen';
import { ManagementHome } from '../src/ui/management/ManagementHome';
import type { ManagementSnapshot } from '@facadeur/api';

const ownerSnapshot: ManagementSnapshot = {
  user: { id: 'user-owner', name: 'Avery Owner', email: 'avery@example.com' },
  organisations: [{ id: 'org-1', name: 'Studio', role: 'owner', archived: false }],
  projects: [{ id: 'project-1', organisationId: 'org-1', name: 'Landing page', archived: false }],
  members: {
    'org-1': [
      {
        id: 'member-owner',
        userId: 'user-owner',
        name: 'Avery Owner',
        email: 'avery@example.com',
        role: 'owner',
      },
      {
        id: 'member-editor',
        userId: 'user-editor',
        name: 'Riley Editor',
        email: 'riley@example.com',
        role: 'editor',
      },
    ],
  },
  invitations: { 'org-1': [] },
  canClaimExamples: false,
};

describe('management workspace UI', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('loads projects, exposes owner actions, and opens the selected project', async () => {
    globalThis.fetch = vi.fn(async () => Response.json(ownerSnapshot)) as typeof fetch;
    const onOpenProject = vi.fn();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);

    await act(async () => root?.render(<ManagementHome onOpenProject={onOpenProject} />));

    expect(host!.textContent).toContain('Landing page');
    expect(
      Array.from(host!.querySelectorAll('button')).some(
        (button) => button.textContent === 'Archive organisation',
      ),
    ).toBe(true);
    await act(async () => {
      Array.from(host!.querySelectorAll('button'))
        .find((button) => button.textContent === 'Open')
        ?.click();
    });
    expect(onOpenProject).toHaveBeenCalledWith('project-1');
    expect(host!.textContent).toContain('Members and invitations');
  });

  it('keeps project mutation controls hidden for viewers while allowing open', async () => {
    const viewerSnapshot: ManagementSnapshot = {
      ...ownerSnapshot,
      organisations: [{ ...ownerSnapshot.organisations[0]!, role: 'viewer' }],
    };
    globalThis.fetch = vi.fn(async () => Response.json(viewerSnapshot)) as typeof fetch;
    const onOpenProject = vi.fn();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);

    await act(async () => root?.render(<ManagementHome onOpenProject={onOpenProject} />));

    expect(
      Array.from(host!.querySelectorAll('button')).some(
        (button) => button.textContent === 'Create project',
      ),
    ).toBe(false);
    expect(host!.textContent).not.toContain('Members and invitations');
    await act(async () => {
      Array.from(host!.querySelectorAll('button'))
        .find((button) => button.textContent === 'Open')
        ?.click();
    });
    expect(onOpenProject).toHaveBeenCalledWith('project-1');
  });

  it('creates an invitation link from the returned token and exposes invitation acceptance', async () => {
    const commands: unknown[] = [];
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { command: unknown };
        commands.push(body.command);
        return Response.json({
          snapshot: ownerSnapshot,
          ...(JSON.stringify(body.command).includes('inviteMember')
            ? { invitationToken: 'invite-secret-token' }
            : {}),
        });
      }
      return Response.json(ownerSnapshot);
    }) as typeof fetch;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);

    await act(async () =>
      root?.render(<ManagementHome onOpenProject={() => {}} invitationToken="incoming-token" />),
    );
    expect(host!.textContent).toContain('Accept invitation');
    await act(async () => {
      Array.from(host!.querySelectorAll('button'))
        .find((button) => button.textContent === 'Create invitation')
        ?.click();
    });
    expect(commands).toHaveLength(0); // The required invite fields prevent an empty invitation.
    const email = host!.querySelector('input[name="inviteEmail"]') as HTMLInputElement;
    await act(async () => {
      const form = email.form!;
      const role = form.querySelector('select[name="inviteRole"]') as HTMLSelectElement;
      email.value = 'new@example.com';
      role.value = 'editor';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(commands).toHaveLength(1);
    expect(host!.querySelector<HTMLInputElement>('#invitation-link')?.value).toContain(
      'invite=invite-secret-token',
    );
    await act(async () => {
      Array.from(host!.querySelectorAll('button'))
        .find((button) => button.textContent === 'Accept invitation')
        ?.click();
    });
    expect(commands).toHaveLength(2);
    expect(commands[1]).toEqual({ type: 'acceptInvitation', token: 'incoming-token' });
    expect(host!.textContent).not.toContain('Accept invitation');
  });

  it('uses the mock email account endpoint and announces successful authentication', async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({ user: { id: 'dev-1', name: 'Taylor', email: 'taylor@example.com' } }),
    ) as typeof fetch;
    const onAuthenticated = vi.fn();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);

    await act(async () => root?.render(<AuthScreen onAuthenticated={onAuthenticated} />));
    const email = host!.querySelector<HTMLInputElement>('#auth-email')!;
    const name = host!.querySelector<HTMLInputElement>('#auth-name')!;
    const setInputValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!;
    await act(async () => {
      setInputValue.call(email, 'taylor@example.com');
      email.dispatchEvent(new Event('input', { bubbles: true }));
      setInputValue.call(name, 'Taylor');
      name.dispatchEvent(new Event('input', { bubbles: true }));
      host!
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/auth/sign-in',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'taylor@example.com', name: 'Taylor' }),
      }),
    );
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });
});
