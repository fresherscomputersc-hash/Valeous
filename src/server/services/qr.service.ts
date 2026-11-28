import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { getEnv } from '@/lib/env';
import { getDb } from '@/server/db';
import { bookings, checkinScans, qrTokens, tickets } from '@/server/db/schema';
import { transitionBookingState } from './booking.service';
import { recordAuditLog } from '@/server/audit/audit.service';

function getQrSigningSecret(): string {
  return getEnv().CLAIM_CODE_SECRET || getEnv().JWT_SECRET || 'dev-qr-signing-secret-32-chars';
}

function signTokenPayload(payload: string): string {
  return createHmac('sha256', getQrSigningSecret()).update(payload).digest('base64url');
}

export async function issueBookingQrPass(bookingId: string, actorUserId: string) {
  const db = getDb();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    throw new AppError('NOT_FOUND', 'Booking not found.', 404);
  }
  if (booking.userId !== actorUserId) {
    throw new AppError('FORBIDDEN', 'You do not own this booking.', 403);
  }
  if (booking.state !== 'Confirmed' && booking.state !== 'Checked In') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `QR pass is only available for Confirmed bookings (current: ${booking.state}).`,
      409
    );
  }

  let [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.bookingId, bookingId))
    .limit(1);

  if (!ticket) {
    const [created] = await db
      .insert(tickets)
      .values({
        bookingId,
        attendeeName: 'Primary Attendee',
        status: 'issued',
      })
      .returning();
    ticket = created!;
  }

  const nonce = randomBytes(16).toString('hex');
  const expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  await db.insert(qrTokens).values({
    ticketId: ticket.id,
    nonce,
    keyId: 'v1',
    expiresAt: expiresAtIso,
  });

  const payload = `${ticket.id}.${nonce}.${expiresAtMs}`;
  const sig = signTokenPayload(payload);
  const token = `${payload}.${sig}`;

  return {
    bookingId,
    ticketId: ticket.id,
    token,
    expiresAt: expiresAtIso,
    status: ticket.status,
  };
}

export async function scanQrToken(
  rawToken: string,
  deviceId: string,
  staffUserId: string
) {
  const parts = rawToken.trim().split('.');
  if (parts.length !== 4) {
    throw new AppError('QR_INVALID', 'Malformed QR token.', 400);
  }
  const [ticketId, nonce, expStr, providedSig] = parts as [string, string, string, string];
  const payload = `${ticketId}.${nonce}.${expStr}`;
  const expectedSig = signTokenPayload(payload);

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError('QR_INVALID', 'Invalid QR token signature.', 401);
  }

  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || expMs <= Date.now()) {
    throw new AppError('QR_INVALID', 'QR token has expired.', 400);
  }

  const db = getDb();
  const nowIso = new Date().toISOString();

  return db.transaction(async (tx) => {
    const locked = await tx.execute(
      sql`SELECT id, ticket_id, consumed_at, consumed_device_id FROM qr_tokens WHERE nonce = ${nonce} FOR UPDATE`
    );
    const qrRow = locked[0] as
      | {
          id: string;
          ticket_id: string;
          consumed_at: string | null;
          consumed_device_id: string | null;
        }
      | undefined;

    if (!qrRow || qrRow.ticket_id !== ticketId) {
      throw new AppError('QR_INVALID', 'QR token not recognized.', 404);
    }

    if (qrRow.consumed_at) {
      throw new AppError(
        'QR_ALREADY_CONSUMED',
        `QR ticket already used at ${qrRow.consumed_at}.`,
        409
      );
    }

    await tx
      .update(qrTokens)
      .set({ consumedAt: nowIso, consumedDeviceId: deviceId })
      .where(eq(qrTokens.id, qrRow.id));

    const [ticket] = await tx
      .update(tickets)
      .set({ status: 'used', usedAt: nowIso, usedByUserId: staffUserId })
      .where(eq(tickets.id, ticketId))
      .returning();

    await tx.insert(checkinScans).values({
      ticketId,
      deviceId,
      scannedByUserId: staffUserId,
      scannedAt: nowIso,
      offline: false,
      syncStatus: 'SYNCED',
    });

    await transitionBookingState(
      {
        bookingId: ticket!.bookingId,
        toState: 'Checked In',
        actorUserId: staffUserId,
        reason: `QR scanned on device ${deviceId}`,
      },
      tx
    );

    await recordAuditLog(
      {
        actorUserId: staffUserId,
        action: 'QR_TICKET_SCANNED',
        targetType: 'TICKET',
        targetId: ticketId,
        metadata: { bookingId: ticket!.bookingId, deviceId, scannedAt: nowIso },
      },
      tx
    );

    return {
      redeemed: true,
      ticketId,
      bookingId: ticket!.bookingId,
      consumedAt: nowIso,
    };
  });
}
