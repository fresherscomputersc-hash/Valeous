'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Unable to process request');
        return;
      }
      setSubmittedMessage(data.message);
    } catch {
      setError('Network error requesting password reset.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="surface-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-ink-950">Reset your password</h1>
        <p className="mt-1 text-sm text-ink-600">
          Enter your email address and we will send a single-use recovery link valid for 30 minutes.
        </p>

        {submittedMessage ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              {submittedMessage}
            </div>
            <Link href="/login" className="btn-secondary w-full">
              Return to Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-900"
              >
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="forgot-email" className="label-text">
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Sending recovery link…' : 'Send recovery link'}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-xs font-semibold text-brand-700 hover:underline">
                Back to Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
