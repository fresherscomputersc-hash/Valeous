import fs from 'node:fs/promises';
import path from 'node:path';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface TransactionalEmailPayload {
  toEmail: string;
  subject: string;
  text: string;
  html?: string;
  actionUrl?: string;
  expiresAtIso?: string;
}

export interface PasswordResetEmailPayload {
  toEmail: string;
  displayName: string;
  resetUrl: string;
  expiresAtIso: string;
}

export interface EmailVerificationPayload {
  toEmail: string;
  displayName: string;
  verifyUrl: string;
  expiresAtIso: string;
}

export interface DevEmailOutboxItem {
  id: string;
  toEmail: string;
  subject: string;
  text: string;
  resetUrl?: string;
  actionUrl?: string;
  expiresAtIso?: string;
  sentAtIso: string;
}

const DEV_OUTBOX_PATH = path.resolve(process.cwd(), 'storage/dev-emails.json');

export async function sendTransactionalEmail(payload: TransactionalEmailPayload): Promise<void> {
  const env = getEnv();

  if (env.EMAIL_PROVIDER === 'webhook' && env.EMAIL_WEBHOOK_URL) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (env.EMAIL_API_KEY) {
        headers['Authorization'] = `Bearer ${env.EMAIL_API_KEY}`;
      }

      const response = await fetch(env.EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: payload.toEmail,
          subject: payload.subject,
          text: payload.text,
          html:
            payload.html ||
            `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;"><h2 style="margin-top:0;color:#0f172a;">${payload.subject}</h2><p style="color:#334155;line-height:1.6;white-space:pre-line;">${payload.text}</p>${
              payload.actionUrl
                ? `<p style="margin-top:20px;"><a href="${payload.actionUrl}" style="display:inline-block;background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Open VALUEOUS</a></p>`
                : ''
            }</div>`,
        }),
      });

      if (!response.ok) {
        logger.error('Transactional email webhook failed', {
          status: response.status,
          subject: payload.subject,
        });
      }
      return;
    } catch (err) {
      logger.error('Transactional email transport error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }
  }

  // Local / test outbox adapter
  await fs.mkdir(path.dirname(DEV_OUTBOX_PATH), { recursive: true });
  let existing: DevEmailOutboxItem[] = [];
  try {
    const raw = await fs.readFile(DEV_OUTBOX_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      existing = parsed as DevEmailOutboxItem[];
    }
  } catch {
    existing = [];
  }

  existing.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    toEmail: payload.toEmail,
    subject: payload.subject,
    text: payload.text,
    resetUrl: payload.actionUrl,
    actionUrl: payload.actionUrl,
    expiresAtIso: payload.expiresAtIso,
    sentAtIso: new Date().toISOString(),
  });

  await fs.writeFile(DEV_OUTBOX_PATH, JSON.stringify(existing.slice(0, 100), null, 2), 'utf8');
}

export async function sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void> {
  const env = getEnv();
  await sendTransactionalEmail({
    toEmail: payload.toEmail,
    subject: `${env.NEXT_PUBLIC_APP_NAME} — Password recovery instructions`,
    text: `Hi ${payload.displayName},\n\nReset your password using this single-use link (valid until ${payload.expiresAtIso}):\n${payload.resetUrl}\n\nIf you did not request this, ignore this message.`,
    actionUrl: payload.resetUrl,
    expiresAtIso: payload.expiresAtIso,
  });
}

export async function sendEmailVerificationEmail(payload: EmailVerificationPayload): Promise<void> {
  const env = getEnv();
  await sendTransactionalEmail({
    toEmail: payload.toEmail,
    subject: `${env.NEXT_PUBLIC_APP_NAME} — Verify your email address`,
    text: `Hi ${payload.displayName},\n\nVerify your email address to unlock full campaign publishing and payouts on VALUEOUS:\n${payload.verifyUrl}\n\nLink expires at ${payload.expiresAtIso}.`,
    actionUrl: payload.verifyUrl,
    expiresAtIso: payload.expiresAtIso,
  });
}

export async function readDevOutboxForTests(): Promise<DevEmailOutboxItem[]> {
  try {
    const raw = await fs.readFile(DEV_OUTBOX_PATH, 'utf8');
    return JSON.parse(raw) as DevEmailOutboxItem[];
  } catch {
    return [];
  }
}

export async function clearDevOutboxForTests(): Promise<void> {
  try {
    await fs.unlink(DEV_OUTBOX_PATH);
  } catch {
    // ignore if absent
  }
}
