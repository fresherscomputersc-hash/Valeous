import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireBusiness } from '@/server/permissions/rbac';
import { listBusinessEnrollments } from '@/server/services/enrollment.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireBusiness(request);
    const status = request.nextUrl.searchParams.get('status') || undefined;
    const enrollments = await listBusinessEnrollments(actor.businessProfile.id, status);
    return NextResponse.json({ enrollments });
  } catch (err) {
    return toErrorResponse(err);
  }
}
