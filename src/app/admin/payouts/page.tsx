'use client';

import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr } from '@/lib/format';

const FOUR_EYES_THRESHOLD_PAISE = 1000000; // ₹10,000

interface FourEyesPayout {
  id: string;
  creatorHandle: string;
  maskedDestination: string;
  amountPaise: number;
  firstApproverEmail: string | null;
  secondApproverEmail: string | null;
  utrReference: string | null;
  status: 'PENDING' | 'PENDING_CLEARANCE' | 'PAID' | 'REJECTED';
}

const INITIAL_PAYOUTS: FourEyesPayout[] = [
  {
    id: 'pay-901',
    creatorHandle: '@aarav.explores',
    maskedDestination: 'a***@okicici',
    amountPaise: 1500000, // ₹15,000 -> requires four-eyes
    firstApproverEmail: 'ops-lead@valueous.in',
    secondApproverEmail: null,
    utrReference: null,
    status: 'PENDING_CLEARANCE',
  },
  {
    id: 'pay-902',
    creatorHandle: '@meera.wellness',
    maskedDestination: 'm***@hdfcbank',
    amountPaise: 2400000, // ₹24,000 -> requires four-eyes
    firstApproverEmail: null,
    secondApproverEmail: null,
    utrReference: null,
    status: 'PENDING',
  },
  {
    id: 'pay-903',
    creatorHandle: '@rohan.eats',
    maskedDestination: 'r***@ybl',
    amountPaise: 650000, // ₹6,500 -> single admin approval
    firstApproverEmail: null,
    secondApproverEmail: null,
    utrReference: null,
    status: 'PENDING',
  },
];

export default function AdminFourEyesPayoutsPage() {
  const { actor } = useAuth();
  const { notify } = useToast();
  const [payouts, setPayouts] = useState<FourEyesPayout[]>(INITIAL_PAYOUTS);
  const [utrInputs, setUtrInputs] = useState<Record<string, string>>({});

  const currentAdminEmail = actor?.user.email || 'admin@valueous.in';

  function handleFirstSignOff(id: string) {
    setPayouts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              firstApproverEmail: currentAdminEmail,
              status: 'PENDING_CLEARANCE',
            }
          : p
      )
    );
    notify('1st Admin sign-off recorded. Awaiting independent 2nd Admin approval.', 'info');
  }

  function handleFinalApprove(p: FourEyesPayout) {
    const needsFourEyes = p.amountPaise > FOUR_EYES_THRESHOLD_PAISE;
    if (needsFourEyes && p.firstApproverEmail === currentAdminEmail) {
      notify(
        'Four-Eyes Violation: The 2nd approver must be a different Admin than the 1st approver.',
        'error'
      );
      return;
    }

    const utr = utrInputs[p.id]?.trim() || `UTR${Date.now()}`;
    setPayouts((prev) =>
      prev.map((row) =>
        row.id === p.id
          ? {
              ...row,
              secondApproverEmail: needsFourEyes ? currentAdminEmail : null,
              utrReference: utr,
              status: 'PAID',
            }
          : row
      )
    );
    notify(`Payout ${p.id} settled with UTR ${utr}`, 'success');
  }

  function handleReject(id: string) {
    setPayouts((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status: 'REJECTED' } : row))
    );
    notify(`Payout ${id} rejected`, 'info');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Four-Eyes Payout Approval Queue
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Payouts above <strong>{formatInr(FOUR_EYES_THRESHOLD_PAISE)}</strong> require
          independent two-admin sign-off before UTR settlement. Destinations are masked.
        </p>
      </div>

      <div className="space-y-4">
        {payouts.map((p) => {
          const requiresFourEyes = p.amountPaise > FOUR_EYES_THRESHOLD_PAISE;
          const isSameAdmin = p.firstApproverEmail === currentAdminEmail;

          return (
            <div key={p.id} className="surface-card space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-black text-ink-950">
                      {formatInr(p.amountPaise)}
                    </span>
                    {requiresFourEyes && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Four-Eyes Required (&gt; ₹10,000)
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-700">
                    Creator: <strong>{p.creatorHandle}</strong> · Destination:{' '}
                    <span className="font-mono">{p.maskedDestination}</span>
                  </p>
                  {p.firstApproverEmail && (
                    <p className="mt-1 text-[11px] text-ink-600">
                      1st Approver: <span className="font-mono">{p.firstApproverEmail}</span>
                    </p>
                  )}
                  {p.utrReference && (
                    <p className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Settled UTR: {p.utrReference}
                    </p>
                  )}
                </div>

                <StatusBadge status={p.status} />
              </div>

              {p.status !== 'PAID' && p.status !== 'REJECTED' && (
                <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                  {requiresFourEyes && !p.firstApproverEmail ? (
                    <button
                      type="button"
                      onClick={() => handleFirstSignOff(p.id)}
                      className="btn-secondary min-h-[44px] text-xs"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Record 1st Admin Sign-Off
                    </button>
                  ) : (
                    <>
                      <input
                        value={utrInputs[p.id] || ''}
                        onChange={(e) =>
                          setUtrInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        placeholder="Enter Bank UTR Reference"
                        aria-label={`UTR reference for ${p.id}`}
                        className="input-field min-h-[44px] max-w-xs font-mono text-xs"
                      />
                      <button
                        type="button"
                        disabled={requiresFourEyes && isSameAdmin}
                        onClick={() => handleFinalApprove(p)}
                        className="btn-primary min-h-[44px] text-xs"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {requiresFourEyes
                          ? isSameAdmin
                            ? 'Requires 2nd Admin'
                            : '2nd Admin Final Approve & Pay'
                          : 'Approve & Settle'}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleReject(p.id)}
                    className="btn-danger min-h-[44px] text-xs"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
