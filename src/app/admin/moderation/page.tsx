'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, EyeOff, Flag } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';

interface ModerationItem {
  id: string;
  creatorHandle: string;
  title: string;
  proofType: 'Visited' | 'Researched' | 'Gifted' | 'Paid' | 'MISSING';
  flagReason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const INITIAL_MODERATION: ModerationItem[] = [
  {
    id: 'mod-1',
    creatorHandle: '@r***_vlogs',
    title: 'Weekend Coastal Tasting Review',
    proofType: 'Paid',
    flagReason: 'Auto-check: verify ASCI Paid Partnership badge visibility',
    status: 'PENDING',
  },
  {
    id: 'mod-2',
    creatorHandle: '@k***_fit',
    title: 'Best Recovery Clinic in Indiranagar',
    proofType: 'MISSING',
    flagReason: 'Missing mandatory proof_type enum (Visited/Researched/Gifted/Paid)',
    status: 'PENDING',
  },
];

export default function AdminModerationPage() {
  const { notify } = useToast();
  const [queue, setQueue] = useState<ModerationItem[]>(INITIAL_MODERATION);

  function handleDecision(id: string, next: 'APPROVED' | 'REJECTED') {
    const item = queue.find((q) => q.id === id);
    if (next === 'APPROVED' && item?.proofType === 'MISSING') {
      notify('Cannot approve content without a valid proof_type disclosure.', 'error');
      return;
    }
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: next } : q)));
    notify(
      next === 'APPROVED' ? 'Content approved for public discovery' : 'Content hidden from feed',
      'info'
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Content &amp; Proof-Disclosure Moderation Queue
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Enforce mandatory <code className="font-mono">proof_type</code> disclosures and review
          flagged Creator posts. Creator handles are masked during triage.
        </p>
      </div>

      <div className="space-y-4">
        {queue.map((item) => (
          <div key={item.id} className="surface-card space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-ink-600">
                  Creator: {item.creatorHandle}
                </p>
                <h2 className="mt-0.5 text-base font-extrabold text-ink-950">{item.title}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-800">
                  <Flag className="h-3.5 w-3.5" />
                  {item.flagReason}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="rounded-xl bg-ink-50 p-3 text-xs">
              <strong>Disclosure Badge:</strong>{' '}
              {item.proofType === 'MISSING' ? (
                <span className="inline-flex items-center gap-1 font-bold text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Missing proof_type (Cannot approve)
                </span>
              ) : (
                <span className="font-bold text-emerald-700">{item.proofType}</span>
              )}
            </div>

            {item.status === 'PENDING' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDecision(item.id, 'APPROVED')}
                  className="btn-primary min-h-[44px] text-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Content
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(item.id, 'REJECTED')}
                  className="btn-danger min-h-[44px] text-xs"
                >
                  <EyeOff className="h-4 w-4" />
                  Hide &amp; Flag Creator
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
