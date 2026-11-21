import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { AppError, toErrorResponse } from '@/lib/errors';
import { resolveActorFromRequest } from '@/server/auth/session';
import { runHousekeepingTasks } from '@/server/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();
    const cronHeader = request.headers.get('x-cron-secret');
    const actor = await resolveActorFromRequest(request);

    const authorizedByCron = Boolean(env.CRON_SECRET && cronHeader === env.CRON_SECRET);
    const authorizedByAdmin = actor?.user.role === 'ADMIN';

    if (!authorizedByCron && !authorizedByAdmin) {
      throw new AppError('FORBIDDEN', 'Valid cron secret or Admin role required.', 403);
    }

    const summary = await runHousekeepingTasks();
    return NextResponse.json({ status: 'ok', summary });
  } catch (err) {
    return toErrorResponse(err);
  }
}
