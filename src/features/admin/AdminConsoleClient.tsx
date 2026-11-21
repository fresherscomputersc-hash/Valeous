'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, FileText, Sparkles } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDateTime, formatInr } from '@/lib/format';

export function AdminConsoleClient({
  payouts,
  users,
  audits,
  onMutated,
}: {
  payouts: Array<{
    id: string;
    amountPaise: number;
    payoutMethodSnapshot: string;
    status: 'PENDING' | 'PAID' | 'REJECTED';
    paymentReference: string | null;
    note: string | null;
    requestedAt: string;
    influencerHandle: string;
    influencerName: string;
  }>;
  users: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: 'ACTIVE' | 'SUSPENDED';
    emailVerified?: boolean;
    createdAt: string;
  }>;
  audits: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: string;
    actorEmail: string | null;
  }>;
  onMutated?: () => void;
}) {
  const [utrRefs, setUtrRefs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payoutFilter, setPayoutFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [runningCron, setRunningCron] = useState(false);

  const router = useRouter();
  const { notify } = useToast();

  function refresh() {
    if (onMutated) {
      onMutated();
    } else {
      router.refresh();
    }
  }

  async function processPayout(id: string, action: 'PAY' | 'REJECT') {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          paymentReference: utrRefs[id] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Action failed', 'error');
        return;
      }
      notify(
        action === 'PAY'
          ? 'Payout marked PAID with UTR reference!'
          : 'Payout rejected and returned to influencer balance.',
        'success'
      );
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleUserStatus(userId: string, current: 'ACTIVE' | 'SUSPENDED') {
    const next = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: next,
          reason: `Admin toggled status to ${next}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not update user status', 'error');
        return;
      }
      notify(`Account ${next.toLowerCase()}`, 'info');
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function runHousekeeping() {
    setRunningCron(true);
    try {
      const res = await fetch('/api/cron/housekeeping', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Housekeeping failed', 'error');
        return;
      }
      const s = data.summary;
      notify(
        `Housekeeping complete: cleared ${s.clearedSalesCount} matured hold(s), purged ${s.purgedSessions} expired session(s).`,
        'success'
      );
      refresh();
    } finally {
      setRunningCron(false);
    }
  }

  const filteredPayouts = useMemo(
    () =>
      payouts.filter((p) =>
        payoutFilter === 'ALL' ? true : p.status === payoutFilter
      ),
    [payouts, payoutFilter]
  );

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        if (!userSearch.trim()) return true;
        const q = userSearch.toLowerCase();
        return (
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
        );
      }),
    [users, userSearch]
  );

  function exportPayoutsCsv() {
    const rows = [
      ['Requested At', 'Creator', 'Handle', 'Amount (INR)', 'Destination', 'Status', 'UTR'],
      ...filteredPayouts.map((p) => [
        p.requestedAt,
        p.influencerName,
        `@${p.influencerHandle}`,
        (p.amountPaise / 100).toFixed(2),
        p.payoutMethodSnapshot,
        p.status,
        p.paymentReference || '',
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-payouts-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-10">
      {/* Maintenance Bar */}
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 border-purple-200 bg-purple-50/40 p-4 text-xs">
        <div>
          <p className="font-extrabold text-ink-950">
            Automated Platform Housekeeping &amp; Clearance Release
          </p>
          <p className="text-ink-600">
            Purges expired sessions/tokens and releases matured 7-day hold commissions into creator wallets.
          </p>
        </div>
        <button
          type="button"
          disabled={runningCron}
          onClick={runHousekeeping}
          className="btn-secondary py-2 text-xs"
        >
          <Sparkles className="h-4 w-4 text-purple-700" />
          <span>{runningCron ? 'Running…' : 'Run Housekeeping Now'}</span>
        </button>
      </div>

      {/* Payout Settlement Queue */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-ink-950">
            Influencer Payout Requests ({filteredPayouts.length})
          </h2>

          <div className="flex items-center gap-2">
            <select
              value={payoutFilter}
              onChange={(e) => setPayoutFilter(e.target.value)}
              className="input-field w-36 py-1.5 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button
              type="button"
              onClick={exportPayoutsCsv}
              className="btn-secondary py-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="surface-card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ink-200 bg-ink-50/70 font-bold text-ink-600 uppercase">
              <tr>
                <th className="px-4 py-3">Influencer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">UTR / Settlement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filteredPayouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/creators/${p.influencerHandle}`}
                      className="font-bold text-ink-950 hover:text-brand-700 hover:underline"
                    >
                      {p.influencerName}
                    </Link>
                    <p className="text-ink-500">@{p.influencerHandle}</p>
                  </td>
                  <td className="px-4 py-3 font-extrabold text-ink-950">
                    {formatInr(p.amountPaise)}
                  </td>
                  <td className="px-4 py-3">{p.payoutMethodSnapshot}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'PENDING' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={utrRefs[p.id] ?? ''}
                          onChange={(e) =>
                            setUtrRefs((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder="UTR / UPI Ref"
                          className="input-field w-36 py-1.5 font-mono text-xs"
                        />
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => processPayout(p.id, 'PAY')}
                          className="btn-primary py-1.5 text-xs"
                        >
                          Mark Paid
                        </button>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => processPayout(p.id, 'REJECT')}
                          className="btn-secondary py-1.5 text-xs text-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-ink-600">
                          {p.paymentReference || p.note || '—'}
                        </span>
                        <Link
                          href={`/influencer/earnings/receipts/${p.id}`}
                          className="inline-flex items-center gap-1 font-bold text-brand-700 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Slip</span>
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Accounts Governance */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-ink-950">
            Accounts Directory ({filteredUsers.length})
          </h2>
          <input
            type="search"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search email, name, role…"
            className="input-field w-56 py-1.5 text-xs"
          />
        </div>

        <div className="surface-card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ink-200 bg-ink-50/70 font-bold text-ink-600 uppercase">
              <tr>
                <th className="px-4 py-3">Name / Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Email Verified</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink-950">{u.displayName}</p>
                    <p className="text-ink-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.role} />
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {u.emailVerified ? 'Verified' : 'Pending'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'ADMIN' ? (
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => toggleUserStatus(u.id, u.status)}
                        className="btn-secondary py-1 text-xs"
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Trail */}
      <section className="space-y-3">
        <h2 className="text-xl font-extrabold text-ink-950">
          Immutable Security &amp; Ledger Audit Trail
        </h2>
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ink-200 bg-ink-50/70 font-bold text-ink-600 uppercase">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {audits.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2.5 text-ink-500">
                    {formatDateTime(a.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-ink-700">
                    {a.actorEmail || 'System'}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-bold text-ink-950">
                    {a.action}
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">
                    {a.targetType} ({a.targetId.slice(0, 8)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
