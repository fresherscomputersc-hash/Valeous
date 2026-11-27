'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDateTime, formatInr } from '@/lib/format';

export interface ActiveCodeOption {
  promoCode: string;
  influencerHandle: string;
  productTitle: string;
}

export interface SaleRow {
  id: string;
  promoCodeSnapshot: string;
  quantity: number;
  grossAmountPaise: number;
  commissionAmountPaise: number;
  platformFeePaise?: number;
  status?: 'PENDING_CLEARANCE' | 'CONFIRMED' | 'REFUNDED';
  clearsAt?: string | null;
  refundReason?: string | null;
  source?: string;
  orderReference: string | null;
  customerNote: string | null;
  soldAt: string;
  productTitle: string;
  influencerHandle: string;
  influencerName: string;
}

interface SaleCalcResult {
  mode: 'PREVIEW' | 'RECORDED';
  promoCode: string;
  productTitle: string;
  influencerHandle: string;
  influencerName: string;
  quantity: number;
  buyerDiscountPercent: number;
  grossAmountPaise: number;
  commissionType: 'FIXED_PER_SALE' | 'PERCENTAGE';
  commissionFixedPaise: number | null;
  commissionPercent: number | null;
  commissionAmountPaise: number;
  platformFeePaise?: number;
  settlementMode?: string;
  saleId: string | null;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) =>
      r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BusinessSalesLoggerClient({
  initialCode,
  activeCodes,
  sales,
  onMutated,
}: {
  initialCode?: string;
  activeCodes: ActiveCodeOption[];
  sales: SaleRow[];
  onMutated?: () => void;
}) {
  const [promoCode, setPromoCode] = useState(
    initialCode || activeCodes[0]?.promoCode || ''
  );
  const [quantity, setQuantity] = useState('1');
  const [customGrossRupees, setCustomGrossRupees] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [settlementMode, setSettlementMode] = useState<'INSTANT' | 'HOLD_7_DAYS'>(
    'INSTANT'
  );
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<SaleCalcResult | null>(null);

  // CSV Bulk Import state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvBusy, setCsvBusy] = useState(false);

  // Table Filters & Pagination
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const router = useRouter();
  const { refreshActor } = useAuth();
  const { notify } = useToast();

  function triggerRefresh() {
    void refreshActor();
    if (onMutated) {
      onMutated();
    } else {
      router.refresh();
    }
  }

  async function submitSale(dryRun: boolean) {
    setErrorMsg(null);
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        promoCode: promoCode.trim().toUpperCase(),
        quantity: Number(quantity) || 1,
        orderReference: orderReference.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
        settlementMode,
        dryRun,
      };
      if (customGrossRupees.trim()) {
        payload.grossAmountRupees = Number(customGrossRupees);
      }

      const res = await fetch('/api/business/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setCalcResult(null);
        setErrorMsg(data?.error?.message || 'Could not log promo sale');
        return;
      }

      setCalcResult(data.result);
      if (!dryRun) {
        notify(
          `Sale recorded! ${formatInr(data.result.commissionAmountPaise)} ${
            settlementMode === 'HOLD_7_DAYS'
              ? 'placed in 7-day clearance'
              : 'credited'
          } for @${data.result.influencerHandle}.`,
          'success'
        );
        setOrderReference('');
        setCustomerNote('');
        triggerRefresh();
      }
    } catch {
      setErrorMsg('Network error contacting server.');
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkCsvImport() {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.toLowerCase().startsWith('promo_code'));

    if (lines.length === 0) {
      notify('Paste at least 1 CSV order row first.', 'error');
      return;
    }

    const rows = lines.map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const [code, qty, amount, orderRef, note] = cols;
      return {
        promoCode: (code || '').toUpperCase(),
        quantity: Number(qty) || 1,
        grossAmountRupees: amount ? Number(amount) : undefined,
        orderReference: orderRef || undefined,
        customerNote: note || 'Bulk CSV import',
      };
    });

    setCsvBusy(true);
    try {
      const res = await fetch('/api/business/sales/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settlementMode, rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'CSV import failed', 'error');
        return;
      }

      const s = data.summary;
      notify(
        `Imported ${s.importedCount} order(s) (${formatInr(s.totalCommissionPaise)} commissions)${
          s.failedCount > 0 ? ` • ${s.failedCount} skipped` : ''
        }`,
        s.importedCount > 0 ? 'success' : 'error'
      );
      if (s.importedCount > 0) {
        setCsvText('');
        setCsvOpen(false);
        triggerRefresh();
      }
    } catch {
      notify('Network error importing CSV', 'error');
    } finally {
      setCsvBusy(false);
    }
  }

  async function handleResolveSale(saleId: string, action: 'CONFIRM' | 'REFUND') {
    const reason =
      action === 'REFUND'
        ? window.prompt(
            'Enter reason for refunding/reversing this order:',
            'Customer cancelled / returned order'
          )
        : undefined;
    if (action === 'REFUND' && reason === null) return;

    setRowBusyId(saleId);
    try {
      const res = await fetch(`/api/business/sales/${saleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not update sale', 'error');
        return;
      }
      notify(
        action === 'CONFIRM'
          ? 'Sale confirmed & released to creator wallet!'
          : 'Sale refunded & commission reversed.',
        'success'
      );
      triggerRefresh();
    } finally {
      setRowBusyId(null);
    }
  }

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const st = s.status || 'CONFIRMED';
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (searchQ.trim()) {
        const q = searchQ.toLowerCase();
        return (
          s.promoCodeSnapshot.toLowerCase().includes(q) ||
          (s.orderReference || '').toLowerCase().includes(q) ||
          s.productTitle.toLowerCase().includes(q) ||
          s.influencerHandle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sales, statusFilter, searchQ]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const safePage = Math.min(totalPages, page);
  const visibleSales = filteredSales.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  function handleExportSalesCsv() {
    const rows = [
      [
        'Date',
        'Order Ref',
        'Promo Code',
        'Creator',
        'Product',
        'Units',
        'Sale Gross (INR)',
        'Creator Commission (INR)',
        'Status',
        'Source',
      ],
      ...filteredSales.map((s) => [
        s.soldAt,
        s.orderReference || '',
        s.promoCodeSnapshot,
        `@${s.influencerHandle}`,
        s.productTitle,
        String(s.quantity),
        (s.grossAmountPaise / 100).toFixed(2),
        (s.commissionAmountPaise / 100).toFixed(2),
        s.status || 'CONFIRMED',
        s.source || 'MANUAL',
      ]),
    ];
    downloadCsv(`valueous-sales-${Date.now()}.csv`, rows);
  }

  return (
    <div className="space-y-8">
      {/* Sale Logger Card */}
      <section className="surface-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-ink-950">
              Record or Bulk-Import Promo-Code Purchases
            </h2>
            <p className="mt-1 text-xs text-ink-600">
              Duplicate order references are automatically blocked. Choose instant credit or a 7-day return clearance hold.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCsvOpen((v) => !v)}
            className="btn-secondary py-2 text-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span>{csvOpen ? 'Close CSV Import' : 'Bulk CSV Import'}</span>
          </button>
        </div>

        {csvOpen ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-extrabold text-ink-950">
                Paste CSV Rows (`promo_code,quantity,gross_amount_rupees,order_reference,note`)
              </p>
              <button
                type="button"
                onClick={() => {
                  const sampleCode = activeCodes[0]?.promoCode || 'GLOW-ANANYA';
                  setCsvText(
                    `promo_code,quantity,gross_amount_rupees,order_reference,note\n${sampleCode},2,,ORD-CSV-${Date.now().toString().slice(-4)},Website checkout batch`
                  );
                }}
                className="text-xs font-bold text-brand-700 hover:underline"
              >
                Fill sample CSV
              </button>
            </div>

            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="GLOW-ANANYA,2,2338,ORD-2001,Shopify batch"
              className="input-field font-mono text-xs"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-ink-700 hover:text-brand-700">
                <Upload className="h-3.5 w-3.5" />
                <span>Load .csv file</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setCsvText(String(reader.result || ''));
                    reader.readAsText(file);
                  }}
                />
              </label>

              <button
                type="button"
                disabled={csvBusy}
                onClick={handleBulkCsvImport}
                className="btn-primary py-2 text-xs"
              >
                {csvBusy ? 'Importing…' : 'Import CSV Orders'}
              </button>
            </div>
          </div>
        ) : null}

        {activeCodes.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink-500">
              Quick-fill active code:
            </span>
            {activeCodes.map((c) => (
              <button
                key={c.promoCode}
                type="button"
                onClick={() => {
                  setPromoCode(c.promoCode);
                  setCalcResult(null);
                  setErrorMsg(null);
                }}
                className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-bold transition ${
                  promoCode === c.promoCode
                    ? 'border-brand-600 bg-brand-50 text-brand-800'
                    : 'border-ink-200 bg-white text-ink-800 hover:border-ink-300'
                }`}
              >
                {c.promoCode} (@{c.influencerHandle})
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <label htmlFor="sale-code" className="label-text">
              Creator Promo Code
            </label>
            <input
              id="sale-code"
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. GLOW-ANANYA"
              className="input-field font-mono uppercase"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="sale-qty" className="label-text">
              Units Sold
            </label>
            <input
              id="sale-qty"
              type="number"
              min="1"
              max="10000"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="sale-gross" className="label-text">
              Net Sale Amount ₹ (optional)
            </label>
            <input
              id="sale-gross"
              type="number"
              min="1"
              step="0.01"
              value={customGrossRupees}
              onChange={(e) => setCustomGrossRupees(e.target.value)}
              placeholder="Auto from retail − discount"
              className="input-field"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="sale-ref" className="label-text">
              Unique Order / Invoice ID
            </label>
            <input
              id="sale-ref"
              type="text"
              value={orderReference}
              onChange={(e) => setOrderReference(e.target.value)}
              placeholder="e.g. ORD-1092 (prevents duplicates)"
              className="input-field"
            />
          </div>

          <div className="sm:col-span-7">
            <label htmlFor="sale-note" className="label-text">
              Note (optional)
            </label>
            <input
              id="sale-note"
              type="text"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="e.g. Website order or in-store redemption"
              className="input-field"
            />
          </div>

          <div className="sm:col-span-5">
            <label htmlFor="sale-settlement" className="label-text">
              Commission Clearance Window
            </label>
            <select
              id="sale-settlement"
              value={settlementMode}
              onChange={(e) =>
                setSettlementMode(e.target.value as 'INSTANT' | 'HOLD_7_DAYS')
              }
              className="input-field"
            >
              <option value="INSTANT">Instant Confirm (Withdrawable now)</option>
              <option value="HOLD_7_DAYS">
                7-Day Return Hold (Pending clearance)
              </option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || !promoCode.trim()}
            onClick={() => submitSale(true)}
            className="btn-secondary"
          >
            <Calculator className="h-4 w-4" />
            <span>Preview Commission</span>
          </button>

          <button
            type="button"
            disabled={busy || !promoCode.trim()}
            onClick={() => submitSale(false)}
            className="btn-primary"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{busy ? 'Recording…' : 'Record Sale & Credit Creator'}</span>
          </button>
        </div>

        {errorMsg ? (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-900"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {calcResult ? (
          <div
            className={`mt-5 rounded-2xl border p-5 text-xs ${
              calcResult.mode === 'RECORDED'
                ? 'border-emerald-300 bg-emerald-50/70'
                : 'border-brand-200 bg-brand-50/60'
            }`}
          >
            <p className="font-extrabold tracking-wider text-ink-900 uppercase">
              {calcResult.mode === 'RECORDED'
                ? 'Sale Recorded'
                : 'Commission Preview (Not Yet Saved)'}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-ink-500">Product</p>
                <p className="font-bold text-ink-950">{calcResult.productTitle}</p>
              </div>
              <div>
                <p className="text-ink-500">Creator</p>
                <p className="font-bold text-ink-950">
                  {calcResult.influencerName} (@{calcResult.influencerHandle})
                </p>
              </div>
              <div>
                <p className="text-ink-500">Order Net ({calcResult.quantity} units)</p>
                <p className="font-bold text-ink-950">
                  {formatInr(calcResult.grossAmountPaise)}
                </p>
              </div>
              <div>
                <p className="text-ink-500">Creator Commission</p>
                <p className="text-base font-black text-emerald-800">
                  {formatInr(calcResult.commissionAmountPaise)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Sales Ledger */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-ink-950">
            Promo-Code Sales Ledger ({filteredSales.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search code, order ID, creator…"
              className="input-field w-48 py-1.5 text-xs"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input-field w-40 py-1.5 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING_CLEARANCE">Pending Clearance</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <button
              type="button"
              onClick={handleExportSalesCsv}
              className="btn-secondary py-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {visibleSales.length === 0 ? (
          <div className="surface-card p-6 text-center text-xs text-ink-500">
            No matching promo-code sales found.
          </div>
        ) : (
          <div className="surface-card overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-200 bg-ink-50/70 font-bold text-ink-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Promo Code</th>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Units / Sale</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {visibleSales.map((s) => {
                  const st = s.status || 'CONFIRMED';
                  return (
                    <tr key={s.id} className="hover:bg-ink-50/40">
                      <td className="px-4 py-3 text-ink-600">
                        <p>{formatDateTime(s.soldAt)}</p>
                        <p className="text-[10px] text-ink-400">
                          {s.orderReference || 'No ref'} · {s.source || 'MANUAL'}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-ink-950">
                        {s.promoCodeSnapshot}
                      </td>
                      <td className="px-4 py-3 text-ink-800">@{s.influencerHandle}</td>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {s.productTitle}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink-900">
                        {s.quantity}u • {formatInr(s.grossAmountPaise)}
                      </td>
                      <td
                        className={`px-4 py-3 font-extrabold ${
                          st === 'REFUNDED'
                            ? 'line-through text-ink-400'
                            : 'text-emerald-700'
                        }`}
                      >
                        {formatInr(s.commissionAmountPaise)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={st} />
                        {s.refundReason ? (
                          <p className="mt-0.5 text-[10px] text-red-700">
                            {s.refundReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {st === 'PENDING_CLEARANCE' ? (
                            <button
                              type="button"
                              disabled={rowBusyId === s.id}
                              onClick={() => handleResolveSale(s.id, 'CONFIRM')}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                            >
                              Confirm
                            </button>
                          ) : null}
                          {st !== 'REFUNDED' ? (
                            <button
                              type="button"
                              disabled={rowBusyId === s.id}
                              onClick={() => handleResolveSale(s.id, 'REFUND')}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Refund
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-ink-100 px-4 py-2.5 text-xs">
                <span className="text-ink-500">
                  Page {safePage} of {totalPages}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="btn-secondary py-1 text-xs disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="btn-secondary py-1 text-xs disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
