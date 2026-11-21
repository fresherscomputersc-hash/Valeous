import { NextRequest, NextResponse } from 'next/server';
import { AppError, toErrorResponse } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import { validateAndStoreImageUpload } from '@/server/services/media.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    checkRateLimit({
      namespace: 'uploads:image',
      key: actor.user.id,
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    const formData = await request.formData();
    const file = formData.get('file');
    const altText = formData.get('altText');

    if (!(file instanceof File)) {
      throw new AppError('VALIDATION_ERROR', 'Attach an image file under "file".', 400);
    }

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const asset = await validateAndStoreImageUpload({
      ownerUserId: actor.user.id,
      fileName: file.name,
      declaredMimeType: file.type,
      buffer,
      altText: typeof altText === 'string' ? altText : null,
    });

    return NextResponse.json(
      {
        asset: {
          id: asset.id,
          url: asset.publicUrl,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
          altText: asset.altText,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
