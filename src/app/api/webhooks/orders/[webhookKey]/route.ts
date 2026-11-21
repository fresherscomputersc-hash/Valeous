import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import { getRequestMeta } from '@/server/auth/session';
import { ingestExternalStoreOrderWebhook } from '@/server/services/sales-wallet.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ webhookKey: string }> }
) {
  try {
    const { webhookKey } = await context.params;
    const meta = await getRequestMeta(request);
    await enforcePersistentRateLimit({
      namespace: 'webhook:orders',
      key: `${webhookKey}:${meta.ipAddress}`,
      limit: 120,
      windowMs: 60 * 1000,
    });

    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-promobridge-signature');

    const result = await ingestExternalStoreOrderWebhook({
      webhookKey,
      rawBody,
      signatureHeader,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
