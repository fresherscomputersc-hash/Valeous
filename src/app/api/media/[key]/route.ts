import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { readLocalMediaAsset } from '@/server/services/media.service';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await context.params;
    const { buffer, mimeType } = await readLocalMediaAsset(key);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
