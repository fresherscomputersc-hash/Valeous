'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const { notify } = useToast();

  const [token, setToken] = useState(sp.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Reset failed');
        return;
      }
      notify('Password updated! Sign in with your new password.', 'success');
      router.push('/login');
    } catch {
      setError('Network error resetting password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="surface-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-ink-950">Choose a new password</h1>
        <p className="mt-1 text-sm text-ink-600">
          Completing password reset revokes all active sessions for your account.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-900"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="reset-token" className="label-text">
              Recovery token
            </label>
            <input
              id="reset-token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="input-field font-mono text-xs"
              placeholder="Paste recovery token"
            />
          </div>

          <div>
            <label htmlFor="reset-new-password" className="label-text">
              New password (minimum 8 characters)
            </label>
            <input
              id="reset-new-password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Updating password…' : 'Set new password'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/login" className="text-xs font-semibold text-brand-700 hover:underline">
            Back to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
