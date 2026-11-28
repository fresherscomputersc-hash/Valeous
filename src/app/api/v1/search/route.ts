import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { searchCatalogue } from '@/server/services/catalogue.service';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const lat = sp.get('lat') ? Number(sp.get('lat')) : undefined;
    const lng = sp.get('lng') ? Number(sp.get('lng')) : undefined;
    const radiusKm = sp.get('radiusKm') ? Number(sp.get('radiusKm')) : undefined;

    const results = await searchCatalogue({
      q: sp.get('q') ?? undefined,
      city: sp.get('city') ?? undefined,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      radiusKm: Number.isFinite(radiusKm) ? radiusKm : undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
    });

    return NextResponse.json({ results, count: results.length });
  } catch (err) {
    return toErrorResponse(err);
  }
}
