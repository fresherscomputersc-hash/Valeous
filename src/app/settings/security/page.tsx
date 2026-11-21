'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Laptop, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { formatShortDate } from '@/lib/format';

interface SessionRow {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const { actor, ready } = useAuth();
  const router = useRouter();
  const { notify } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revoking, setRevoking] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/auth/sessions', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!actor) {
      router.replace('/login?next=/settings/security');
      return;
    }
    void loadSessions();
  }, [ready, actor, router, loadSessions]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPwd(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Password update failed', 'error');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      notify('Password updated & other devices signed out!', 'success');
      void loadSessions();
    } catch {
      notify('Network error while updating password', 'error');
    } finally {
      setChangingPwd(false);
    }
  }

  async function handleRevokeOthers() {
    setRevoking(true);
    try {
      const res = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not revoke sessions', 'error');
        return;
      }
      notify(`Signed out ${data.revokedCount} other session(s).`, 'success');
      void loadSessions();
    } catch {
      notify('Network error', 'error');
    } finally {
      setRevoking(false);
    }
  }

  if (!ready || !actor) {
    return (
      <div className="py-12 text-center text-sm text-ink-500">
        Loading account security…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Account Security &amp; Sessions
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Signed in as <span className="font-bold text-ink-900">{actor.user.email}</span>{' '}
          ({actor.user.emailVerified ? 'Verified Email' : 'Unverified Email'})
        </p>
      </div>

      {/* Change Password */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-extrabold text-ink-950">Change Password</h2>
        </div>
        <p className="mt-1 text-xs text-ink-600">
          Updating your password automatically signs out any other logged-in browsers.
        </p>

        <form onSubmit={handleChangePassword} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sec-current-pwd" className="label-text">
              Current Password
            </label>
            <input
              id="sec-current-pwd"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="sec-new-pwd" className="label-text">
              New Password (min 8 chars)
            </label>
            <input
              id="sec-new-pwd"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={changingPwd} className="btn-primary text-xs">
              {changingPwd ? 'Updating password…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Sessions */}
      <div className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-extrabold text-ink-950">
                Active Browser Sessions ({sessions.length})
              </h2>
              <p className="text-xs text-ink-600">
                Devices currently signed in to your VALUEOUS account.
              </p>
            </div>
          </div>

          {sessions.length > 1 ? (
            <button
              type="button"
              disabled={revoking}
              onClick={handleRevokeOthers}
              className="btn-secondary text-xs text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{revoking ? 'Revoking…' : 'Sign out all other devices'}</span>
            </button>
          ) : null}
        </div>

        <div className="mt-4 space-y-2.5">
          {loadingSessions ? (
            <p className="text-xs text-ink-500">Loading active sessions…</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-ink-50/50 p-3.5 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-ink-600" />
                  <div>
                    <p className="font-bold text-ink-950 line-clamp-1">{s.userAgent}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      IP: {s.ipAddress} · Signed in {formatShortDate(s.createdAt)}
                    </p>
                  </div>
                </div>
                {s.isCurrent ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    Current Device
                  </span>
                ) : (
                  <span className="text-[11px] text-ink-500">Active</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
