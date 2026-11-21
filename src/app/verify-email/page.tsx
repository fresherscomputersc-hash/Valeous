'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, MailWarning } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'verified' | 'error'>(
    token ? 'loading' : 'error'
  );
  const [message, setMessage] = useState(
    token ? 'Verifying your email address…' : 'Missing email verification token.'
  );
  const { refreshActor } = useAuth();
  const { notify } = useToast();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setStatus('error');
          setMessage(data?.error?.message || 'Verification link expired or invalid.');
          return;
        }

        setStatus('verified');
        setMessage('Your email address has been verified!');
        notify('Email verified!', 'success');
        await refreshActor();
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Network error while verifying email.');
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [token, notify, refreshActor]);

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="surface-card p-6 text-center sm:p-8">
        {status === 'verified' ? (
          <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-600" />
        ) : (
          <MailWarning className="mx-auto h-11 w-11 text-amber-600" />
        )}

        <h1 className="mt-3 text-xl font-extrabold text-ink-950">
          {status === 'loading'
            ? 'Confirming Email…'
            : status === 'verified'
              ? 'Email Verified!'
              : 'Verification Issue'}
        </h1>

        <p className="mt-2 text-xs text-ink-600">{message}</p>

        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-primary py-2 text-xs">
            Continue to Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm">Verifying…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
