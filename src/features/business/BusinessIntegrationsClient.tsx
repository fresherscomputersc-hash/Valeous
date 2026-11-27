'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff, RefreshCw, Send, Webhook } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr } from '@/lib/format';

export function BusinessIntegrationsClient() {
  const [webhookKey, setWebhookKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [activeCodes, setActiveCodes] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [testing, setTesting] = useState(false);

  const { refreshActor } = useAuth();
  const { notify } = useToast();

  const loadData = useCallback(async () => {
    const [walletRes, enrRes] = await Promise.all([
      fetch('/api/business/wallet', { credentials: 'include' }),
      fetch('/api/business/enrollments?status=APPROVED', { credentials: 'include' }),
    ]);

    if (walletRes.ok) {
      const w = await walletRes.json();
      setWebhookKey(w.wallet.webhookKey);
      setWebhookSecret(w.wallet.webhookSecret);
    }

    if (enrRes.ok) {
      const e = await enrRes.json();
      const codes = (e.enrollments || [])
        .map((r: { promoCode: string | null }) => r.promoCode)
        .filter(Boolean) as string[];
      setActiveCodes(codes);
      if (codes[0]) setSelectedCode(codes[0]);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://promobridge.example.com';
  const endpointUrl = `${origin}/api/webhooks/orders/${webhookKey}`;

  function copyValue(key: string, val: string) {
    void navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1600);
  }

  async function handleRotateSecret() {
    setRotating(true);
    try {
      const res = await fetch('/api/business/integrations/rotate', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not rotate secret', 'error');
        return;
      }
      setWebhookSecret(data.credentials.webhookSecret);
      notify('Webhook signing secret rotated!', 'success');
    } finally {
      setRotating(false);
    }
  }

  async function handleSendTestOrder() {
    if (!selectedCode) {
      notify('Approve at least 1 creator promo code first to run a live test.', 'error');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/business/integrations/rotate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          promoCode: selectedCode,
          quantity: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Test webhook failed', 'error');
        return;
      }
      const sale = data.result?.sale;
      notify(
        `Signed webhook verified! Order recorded on ${selectedCode} (${formatInr(sale?.commissionAmountPaise ?? 0)} credited).`,
        'success'
      );
      await refreshActor();
    } finally {
      setTesting(false);
    }
  }

  const sampleCodeSnippet = `const crypto = require('crypto');

const body = JSON.stringify({
  order_id: 'ORD-9012',
  discount_code: '${selectedCode || 'GLOW-ANANYA'}',
  quantity: 2,
  total_price: 2338
});

const signature = crypto
  .createHmac('sha256', '${showSecret ? webhookSecret : 'YOUR_WEBHOOK_SECRET'}')
  .update(body, 'utf8')
  .digest('hex');

await fetch('${endpointUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-PromoBridge-Signature': 'sha256=' + signature
  },
  body
});`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Automated Store Order Webhooks
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Connect Shopify, WooCommerce, or your custom store checkout so every order using a creator’s promo code records itself automatically—zero manual entry.
        </p>
      </div>

      {/* Endpoint + Secret */}
      <section className="surface-card space-y-5 p-6">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-extrabold text-ink-950">
            Your Brand Webhook Credentials
          </h2>
        </div>

        <div>
          <label className="label-text">POST Webhook Endpoint URL</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={endpointUrl}
              className="input-field font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => copyValue('url', endpointUrl)}
              className="btn-secondary shrink-0 py-2 text-xs"
            >
              {copiedField === 'url' ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>Copy URL</span>
            </button>
          </div>
        </div>

        <div>
          <label className="label-text">
            HMAC-SHA256 Signing Secret (`X-PromoBridge-Signature`)
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type={showSecret ? 'text' : 'password'}
              readOnly
              value={webhookSecret}
              className="input-field flex-1 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="btn-secondary py-2 text-xs"
            >
              {showSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span>{showSecret ? 'Hide' : 'Reveal'}</span>
            </button>
            <button
              type="button"
              onClick={() => copyValue('secret', webhookSecret)}
              className="btn-secondary py-2 text-xs"
            >
              {copiedField === 'secret' ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>Copy</span>
            </button>
            <button
              type="button"
              disabled={rotating}
              onClick={handleRotateSecret}
              className="btn-secondary py-2 text-xs text-amber-800"
            >
              <RefreshCw className="h-4 w-4" />
              <span>{rotating ? 'Rotating…' : 'Rotate Secret'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 1-Click Live Self Test */}
      <section className="surface-card space-y-4 border-emerald-200 bg-emerald-50/40 p-6">
        <h2 className="text-base font-extrabold text-ink-950">
          Test Live HMAC Webhook Delivery
        </h2>
        <p className="text-xs text-ink-600">
          Fires a real HMAC-SHA256 signed order payload through the webhook verifier and records a verified sale on your chosen active promo code.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="input-field w-56 font-mono text-xs"
          >
            {activeCodes.length === 0 ? (
              <option value="">No active promo codes yet</option>
            ) : (
              activeCodes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            disabled={testing || !selectedCode}
            onClick={handleSendTestOrder}
            className="btn-primary py-2 text-xs"
          >
            <Send className="h-4 w-4" />
            <span>
              {testing ? 'Sending signed webhook…' : 'Send Signed Test Webhook Order'}
            </span>
          </button>
        </div>
      </section>

      {/* Integration Snippet */}
      <section className="surface-card space-y-3 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink-950">
            Node.js / Checkout Webhook Example
          </h2>
          <button
            type="button"
            onClick={() => copyValue('code', sampleCodeSnippet)}
            className="btn-secondary py-1.5 text-xs"
          >
            {copiedField === 'code' ? 'Copied!' : 'Copy Snippet'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-ink-950 p-4 font-mono text-xs text-ink-100">
          {sampleCodeSnippet}
        </pre>
      </section>
    </div>
  );
}
