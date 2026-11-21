import { NextRequest, NextResponse } from 'next/server';
import { getRequestMeta } from '@/server/auth/session';
import { recordPromoLinkClick } from '@/server/services/enrollment.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const meta = await getRequestMeta(request);
    const result = await recordPromoLinkClick({
      code,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      referer: request.headers.get('referer'),
    });

    if (result.redirectUrl.startsWith('http://') || result.redirectUrl.startsWith('https://')) {
      return NextResponse.redirect(result.redirectUrl, { status: 302 });
    }

    return NextResponse.redirect(new URL(result.redirectUrl, request.url), {
      status: 302,
    });
  } catch {
    return NextResponse.redirect(new URL('/?invalid_promo=1', request.url), {
      status: 302,
    });
  }
}
