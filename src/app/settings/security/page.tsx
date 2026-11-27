'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Laptop,
  Phone,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
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

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  // TOTP MFA state (Blueprint Ch. 14 / VLS-109)
  const [mfaActive, setMfaActive] = useState(false);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [totpToken, setTotpToken] = useState('');
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Phone OTP state (Blueprint Ch. 5 / VLS-109)
  const [phone, setPhone] = useState('+91');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Active sessions state
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

  async function handleStartTotpEnroll() {
    setMfaEnrolling(true);
    try {
      const res = await fetch('/api/auth/mfa/enroll', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not enroll in MFA', 'error');
        setMfaEnrolling(false);
        return;
      }
      setMfaSecret(data.secret);
      setOtpauthUri(data.otpauthUri);
      notify('MFA secret generated! Scan or enter into your authenticator.', 'info');
    } catch {
      notify('Network error enrolling MFA', 'error');
      setMfaEnrolling(false);
    }
  }

  async function handleVerifyTotpMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!totpToken || totpToken.length !== 6) {
      notify('Enter a valid 6-digit authenticator code', 'error');
      return;
    }
    setVerifyingMfa(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: totpToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Invalid authenticator code', 'error');
        return;
      }
      setMfaActive(true);
      setMfaEnrolling(false);
      setTotpToken('');
      notify('Two-Factor Authentication (TOTP) activated successfully!', 'success');
    } catch {
      notify('Network error verifying MFA', 'error');
    } finally {
      setVerifyingMfa(false);
    }
  }

  function handleCopySecret() {
    if (!mfaSecret) return;
    void navigator.clipboard.writeText(mfaSecret);
    setCopiedSecret(true);
    notify('Secret key copied to clipboard!', 'success');
    setTimeout(() => setCopiedSecret(false), 2500);
  }

  async function handleRequestPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      notify('Enter a valid phone number (e.g., +919876543210)', 'error');
      return;
    }
    setRequestingOtp(true);
    try {
      const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: formatted }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Failed to send phone OTP', 'error');
        return;
      }
      setPhone(formatted);
      setOtpRequested(true);
      if (data.devCode) {
        setOtpDevCode(data.devCode);
        notify(`OTP sent! [Dev Mode Code: ${data.devCode}]`, 'info');
      } else {
        notify('6-digit OTP code sent to your mobile phone!', 'success');
      }
    } catch {
      notify('Network error requesting OTP', 'error');
    } finally {
      setRequestingOtp(false);
    }
  }

  async function handleVerifyPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      notify('Enter the 6-digit OTP code', 'error');
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Invalid or expired OTP', 'error');
        return;
      }
      setPhoneVerified(true);
      setOtpRequested(false);
      setOtpCode('');
      notify('Phone number verified and bound to your account!', 'success');
    } catch {
      notify('Network error verifying OTP', 'error');
    } finally {
      setVerifyingOtp(false);
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
      <div className="mx-auto max-w-3xl space-y-6 py-12" aria-busy="true">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-48 w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Account Security &amp; Authentication
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Signed in as <span className="font-bold text-ink-900">{actor.user.email}</span>{' '}
          ({actor.user.emailVerified ? 'Verified Email' : 'Unverified Email'}) • Role:{' '}
          <span className="font-semibold">{actor.user.role}</span>
        </p>
      </div>

      {/* Two-Factor Authentication (TOTP MFA) */}
      <div className="surface-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-base font-extrabold text-ink-950">
                Two-Factor Authentication (TOTP MFA)
              </h2>
              <p className="text-xs text-ink-600">
                Mandatory for admin and finance operations. Protects against credential compromise.
              </p>
            </div>
          </div>
          {mfaActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Active</span>
            </span>
          ) : (
            <span className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-600">
              Disabled
            </span>
          )}
        </div>

        {mfaActive ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-950">
            <p className="font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span>Two-Factor Authentication is active</span>
            </p>
            <p className="mt-1 text-emerald-800 leading-relaxed">
              Your account is guarded with standard time-based one-time passwords (RFC 6238). Keep your authenticator app handy for sensitive actions.
            </p>
          </div>
        ) : !mfaEnrolling ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleStartTotpEnroll}
              className="btn-primary min-h-[44px] text-xs"
            >
              <Smartphone className="h-4 w-4" />
              <span>Set up Two-Factor Authentication (TOTP)</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-5 text-xs">
            <p className="font-extrabold text-ink-950">
              Step 1: Add to your Authenticator App
            </p>
            <p className="text-ink-600">
              Use Google Authenticator, Authy, or 1Password. Enter the manual key below into your authenticator app:
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-xl border border-brand-300 bg-white px-3.5 py-2 font-mono text-sm font-bold text-ink-950">
                {mfaSecret}
              </code>
              <button
                type="button"
                onClick={handleCopySecret}
                className="btn-secondary min-h-[44px] py-2 text-xs"
              >
                {copiedSecret ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Key</span>
                  </>
                )}
              </button>
            </div>

            {otpauthUri ? (
              <div className="rounded-xl border border-ink-200 bg-white p-3 text-[11px] text-ink-500 break-all font-mono">
                <span className="font-bold text-ink-700">URI: </span>
                {otpauthUri}
              </div>
            ) : null}

            <form onSubmit={handleVerifyTotpMfa} className="space-y-3 pt-2">
              <p className="font-extrabold text-ink-950">
                Step 2: Enter 6-digit Authenticator Code to confirm
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="input-field min-h-[44px] w-48 text-center font-mono text-lg font-bold tracking-widest"
                />
                <button
                  type="submit"
                  disabled={verifyingMfa || totpToken.length !== 6}
                  className="btn-primary min-h-[44px] text-xs"
                >
                  {verifyingMfa ? 'Verifying code…' : 'Verify & Activate MFA'}
                </button>
                <button
                  type="button"
                  onClick={() => setMfaEnrolling(false)}
                  className="btn-secondary min-h-[44px] text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Phone Number & SMS/OTP Verification */}
      <div className="surface-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Phone className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-base font-extrabold text-ink-950">
                Phone Number &amp; OTP Verification
              </h2>
              <p className="text-xs text-ink-600">
                Used for instant passwordless sign-in and transactional booking alerts.
              </p>
            </div>
          </div>
          {phoneVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Verified</span>
            </span>
          ) : (
            <span className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-600">
              Unverified
            </span>
          )}
        </div>

        {phoneVerified ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-950">
            <p className="font-bold">Mobile Phone Bound: {phone}</p>
            <p className="mt-1 text-emerald-800">
              You can now use this phone number for OTP-based sign-in and security recovery.
            </p>
          </div>
        ) : !otpRequested ? (
          <form onSubmit={handleRequestPhoneOtp} className="mt-4 space-y-3">
            <div className="max-w-md">
              <label htmlFor="sec-phone" className="label-text">
                Mobile Number (India E.164)
              </label>
              <div className="flex gap-2">
                <input
                  id="sec-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="input-field min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={requestingOtp}
                  className="btn-primary min-h-[44px] shrink-0 text-xs"
                >
                  {requestingOtp ? 'Sending…' : 'Send OTP'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyPhoneOtp} className="mt-4 space-y-3">
            <p className="text-xs text-ink-600">
              Enter the 6-digit code sent to <span className="font-bold">{phone}</span>:
            </p>
            {otpDevCode ? (
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-2 text-xs font-semibold text-brand-900 max-w-sm">
                [Dev Mode OTP Code]: <span className="font-mono font-black">{otpDevCode}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="input-field min-h-[44px] w-44 text-center font-mono text-lg font-bold tracking-widest"
              />
              <button
                type="submit"
                disabled={verifyingOtp || otpCode.length !== 6}
                className="btn-primary min-h-[44px] text-xs"
              >
                {verifyingOtp ? 'Verifying…' : 'Confirm Code'}
              </button>
              <button
                type="button"
                onClick={() => setOtpRequested(false)}
                className="btn-secondary min-h-[44px] text-xs"
              >
                Change Number
              </button>
            </div>
          </form>
        )}
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
              className="input-field min-h-[44px]"
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
              className="input-field min-h-[44px]"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={changingPwd}
              className="btn-primary min-h-[44px] text-xs"
            >
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
              className="btn-secondary min-h-[44px] text-xs text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{revoking ? 'Revoking…' : 'Sign out all other devices'}</span>
            </button>
          ) : null}
        </div>

        <div className="mt-4 space-y-2.5">
          {loadingSessions ? (
            <div className="space-y-2" aria-busy="true">
              <div className="skeleton h-14 w-full" />
              <div className="skeleton h-14 w-full" />
            </div>
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
