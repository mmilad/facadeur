'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ManagementCommand, ManagementSnapshot } from '@facadeur/api';
import { api } from '../../domain/api.js';
import { OrganisationWorkspace } from './OrganisationWorkspace.js';
import './management.css';

export function ManagementHome({
  onOpenProject,
  invitationToken,
  onSignOut,
}: {
  onOpenProject: (id: string) => void;
  invitationToken?: string;
  onSignOut?: () => void | Promise<void>;
}) {
  const [snapshot, setSnapshot] = useState<ManagementSnapshot>();
  const [selectedOrganisationId, setSelectedOrganisationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [invitationAccepted, setInvitationAccepted] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const next = await api.workspace.load();
      setSnapshot(next);
      setSelectedOrganisationId((current) =>
        next.organisations.some((organisation) => organisation.id === current)
          ? current
          : (next.organisations[0]?.id ?? ''),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your workspace');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedOrganisation =
    snapshot?.organisations.find(({ id }) => id === selectedOrganisationId) ??
    snapshot?.organisations[0];
  const selectedProjects = useMemo(
    () =>
      snapshot?.projects.filter((project) => project.organisationId === selectedOrganisation?.id) ??
      [],
    [snapshot, selectedOrganisation?.id],
  );
  const canManage =
    selectedOrganisation?.role === 'owner' || selectedOrganisation?.role === 'admin';

  const execute = async (command: ManagementCommand) => {
    setBusy(true);
    setError('');
    setNotice('');
    setInvitationLink('');
    try {
      const result = await api.workspace.command(command);
      setSnapshot(result.snapshot);
      if (result.invitationToken) {
        const link = new URL('/', window.location.origin);
        link.searchParams.set('invite', result.invitationToken);
        setInvitationLink(link.toString());
        setNotice('Invitation created. Copy the link and send it to the invited person.');
      } else {
        setNotice('Changes saved.');
      }
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The change could not be saved');
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const createOrganisation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('organisationName') ?? '').trim();
    if (!name) return;
    const result = await execute({ type: 'createOrganisation', name });
    if (result) {
      setSelectedOrganisationId(
        result.snapshot.organisations.find(
          (organisation) =>
            !snapshot?.organisations.some((existing) => existing.id === organisation.id),
        )?.id ??
          result.snapshot.organisations[0]?.id ??
          '',
      );
      form.reset();
    }
  };

  const acceptInvitation = async () => {
    if (invitationToken && (await execute({ type: 'acceptInvitation', token: invitationToken }))) {
      setInvitationAccepted(true);
    }
  };

  return (
    <main className="management-page">
      <header className="management-header">
        <div>
          <p className="management-eyebrow">Workspace · mock authentication</p>
          <h1>Projects and people</h1>
          <p className="management-subtitle">
            {snapshot
              ? `Signed in as ${snapshot.user.name} · ${snapshot.user.email}`
              : 'Loading your workspace'}
          </p>
        </div>
        <div className="management-actions">
          <button
            type="button"
            className="management-button subtle"
            onClick={() => void refresh()}
            disabled={busy}
          >
            Refresh
          </button>
          {onSignOut ? (
            <button
              type="button"
              className="management-button subtle"
              onClick={() => void onSignOut()}
            >
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <p className="management-message error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="management-message" role="status">
          {notice}
        </p>
      ) : null}
      {invitationLink ? (
        <div className="management-invitation-link">
          <label htmlFor="invitation-link">Invitation link</label>
          <input
            id="invitation-link"
            readOnly
            value={invitationLink}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            type="button"
            className="management-button"
            onClick={() => {
              const clipboard = navigator.clipboard;
              if (!clipboard?.writeText) {
                const input = document.getElementById('invitation-link');
                if (input instanceof HTMLInputElement) {
                  input.select();
                  setNotice('Select the invitation link and copy it to share it.');
                }
                return;
              }
              void clipboard.writeText(invitationLink).then(
                () => setNotice('Invitation link copied. Share it with the invited person.'),
                () => {
                  const input = document.getElementById('invitation-link');
                  if (input instanceof HTMLInputElement) {
                    input.select();
                    setNotice('Select the invitation link and copy it to share it.');
                  }
                },
              );
            }}
          >
            Copy invitation link
          </button>
        </div>
      ) : null}

      {invitationToken && !invitationAccepted ? (
        <section className="management-callout" aria-labelledby="accept-invitation-heading">
          <div>
            <h2 id="accept-invitation-heading">You have a project invitation</h2>
            <p>Accept it while signed in with the email address that was invited.</p>
          </div>
          <button
            type="button"
            className="management-button primary"
            onClick={() => void acceptInvitation()}
            disabled={busy}
          >
            Accept invitation
          </button>
        </section>
      ) : null}

      <section className="management-panel" aria-labelledby="organisations-heading">
        <div className="management-section-heading">
          <div>
            <p className="management-eyebrow">Your account</p>
            <h2 id="organisations-heading">Organisations</h2>
          </div>
        </div>
        {snapshot?.organisations.length ? (
          <div className="management-org-list" role="list" aria-label="Your organisations">
            {snapshot.organisations.map((organisation) => (
              <button
                key={organisation.id}
                type="button"
                role="listitem"
                className={`management-org-choice${selectedOrganisation?.id === organisation.id ? ' active' : ''}`}
                onClick={() => setSelectedOrganisationId(organisation.id)}
                aria-pressed={selectedOrganisation?.id === organisation.id}
              >
                <span className="management-org-name">{organisation.name}</span>
                <span className="management-org-meta">
                  {organisation.role} · {organisation.archived ? 'Archived' : 'Active'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="management-empty">Create an organisation to start a shared workspace.</p>
        )}
        <form
          className="management-inline-form"
          onSubmit={(event) => void createOrganisation(event)}
        >
          <label>
            <span className="sr-only">New organisation name</span>
            <input
              name="organisationName"
              required
              maxLength={100}
              placeholder="Organisation name"
            />
          </label>
          <button type="submit" className="management-button primary" disabled={busy}>
            Create organisation
          </button>
        </form>
      </section>

      {selectedOrganisation ? (
        <OrganisationWorkspace
          key={selectedOrganisation.id}
          organisation={selectedOrganisation}
          projects={selectedProjects}
          snapshot={snapshot!}
          canManage={Boolean(canManage)}
          busy={busy}
          execute={execute}
          canClaimExamples={snapshot!.canClaimExamples}
          onOpenProject={onOpenProject}
        />
      ) : null}
    </main>
  );
}
