'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Link2, Megaphone } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr } from '@/lib/format';

const CAMPAIGN_STAGES = [
  'Invited',
  'Applied',
  'Approved',
  'Briefed',
  'Draft Submitted',
  'Changes Requested',
  'Published',
  'Tracking Active',
  'Disputed',
  'Settled',
] as const;

type CampaignStage = (typeof CAMPAIGN_STAGES)[number];

interface CampaignItem {
  id: string;
  brandName: string;
  serviceTitle: string;
  stage: CampaignStage;
  promoCode: string;
  trackingUrl: string;
  commissionRatePct: number;
  earnedPaise: number;
  disputeHold: boolean;
}

export default function CreatorCampaignsPage() {
  const { notify } = useToast();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([
    {
      id: 'cmp-1',
      brandName: 'Prana Studio Indiranagar',
      serviceTitle: 'Ayurvedic Deep Tissue & Recovery Session',
      stage: 'Tracking Active',
      promoCode: 'AARAV15',
      trackingUrl: 'https://valueous.in/r/AARAV15',
      commissionRatePct: 12,
      earnedPaise: 540000,
      disputeHold: false,
    },
    {
      id: 'cmp-2',
      brandName: 'Tide & Table Bandra',
      serviceTitle: 'Chef’s 5-Course Coastal Tasting',
      stage: 'Briefed',
      promoCode: 'TIDE10',
      trackingUrl: 'https://valueous.in/r/TIDE10',
      commissionRatePct: 10,
      earnedPaise: 0,
      disputeHold: false,
    },
    {
      id: 'cmp-3',
      brandName: 'Kinetic Lab Hauz Khas',
      serviceTitle: 'Mobility & Strength Diagnostic',
      stage: 'Disputed',
      promoCode: 'KINETIC20',
      trackingUrl: 'https://valueous.in/r/KINETIC20',
      commissionRatePct: 15,
      earnedPaise: 180000,
      disputeHold: true,
    },
  ]);

  function copyText(text: string, label: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    notify(`${label} copied: ${text}`, 'success');
  }

  function advanceStage(id: string) {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const idx = CAMPAIGN_STAGES.indexOf(c.stage);
        const nextStage = CAMPAIGN_STAGES[Math.min(CAMPAIGN_STAGES.length - 1, idx + 1)];
        return { ...c, stage: nextStage };
      })
    );
    notify('Campaign stage updated', 'info');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          10-Stage Campaign Workspace
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Attribution priority: <strong>Promo Code &gt; Referral Click</strong>. Self-referrals
          are automatically blocked; disputed bookings hold payout until resolved.
        </p>
      </div>

      <div className="space-y-4">
        {campaigns.map((cmp) => {
          const stageIdx = CAMPAIGN_STAGES.indexOf(cmp.stage);
          return (
            <div key={cmp.id} className="surface-card space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-creator-800">{cmp.brandName}</p>
                  <h2 className="text-base font-extrabold text-ink-950">{cmp.serviceTitle}</h2>
                  <p className="mt-1 text-xs text-ink-600">
                    Commission: <strong>{cmp.commissionRatePct}%</strong> · Earned:{' '}
                    <strong className="text-brand-700">{formatInr(cmp.earnedPaise)}</strong>
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    cmp.disputeHold
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : 'border-creator-200 bg-creator-50 text-creator-900'
                  }`}
                >
                  Stage {stageIdx + 1}/10: {cmp.stage}
                </span>
              </div>

              {cmp.disputeHold && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Payout temporarily held due to an open booking dispute. Admin review active.
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyText(cmp.promoCode, 'Promo Code')}
                  className="btn-secondary min-h-[44px] text-xs font-mono"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Code: {cmp.promoCode}
                </button>
                <button
                  type="button"
                  onClick={() => copyText(cmp.trackingUrl, 'Tracking Link')}
                  className="btn-secondary min-h-[44px] text-xs"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Copy Referral Link
                </button>
                {cmp.stage !== 'Settled' && !cmp.disputeHold && (
                  <button
                    type="button"
                    onClick={() => advanceStage(cmp.id)}
                    className="btn-primary min-h-[44px] text-xs"
                  >
                    <Megaphone className="h-3.5 w-3.5" />
                    Submit Next Milestone
                  </button>
                )}
                {cmp.stage === 'Settled' && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Settled in Ledger
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
