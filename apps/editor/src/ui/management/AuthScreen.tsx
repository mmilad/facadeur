'use client';

import { useState } from 'react';
import { authClient } from '../../domain/auth/client.js';
import './management.css';

export function AuthScreen({
  onAuthenticated,
  invitationToken,
}: {
  onAuthenticated: () => void;
  invitationToken?: string;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authClient.signIn({
        email: email.trim(),
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      onAuthenticated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="management-auth-page">
      <section className="management-auth-card" aria-labelledby="auth-heading">
        <p className="management-eyebrow">Facadeur workspace</p>
        <h1 id="auth-heading">Choose a development account</h1>
        <p className="management-subtitle">
          Mock authentication is enabled for this self-hosted workspace. Enter an email to continue;
          the first sign-in creates a development account.
        </p>
        {invitationToken ? (
          <p className="management-message">
            An invitation is waiting. Use the email address it was sent to.
          </p>
        ) : null}
        {error ? (
          <p className="management-message error" role="alert">
            {error}
          </p>
        ) : null}
        <form className="management-auth-form" onSubmit={(event) => void submit(event)}>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="auth-name">
            Name <span>(optional)</span>
          </label>
          <input
            id="auth-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="management-button primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </section>
    </main>
  );
}
