import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_LOCKED'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'OTP_MAX_ATTEMPTS'
  | 'MFA_NOT_ENROLLED'
  | 'INVALID_MFA_CODE'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_ORDER_REFERENCE'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_RESET_TOKEN'
  | 'INVALID_VERIFICATION_TOKEN'
  | 'INVALID_WEBHOOK_SIGNATURE'
  | 'INVALID_STATE_TRANSITION'
  | 'PRODUCT_UNAVAILABLE'
  | 'ALREADY_ENROLLED'
  | 'PROMO_CODE_TAKEN'
  | 'INVALID_PROMO_CODE'
  | 'PROMO_CODE_INACTIVE'
  | 'MISSING_PAYOUT_METHOD'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_BRAND_WALLET'
  | 'INSUFFICIENT_CAMPAIGN_WALLET'
  | 'PAYOUT_BELOW_MINIMUM'
  | 'ALREADY_PROCESSED'
  | 'WRONG_BUSINESS'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'FILE_TOO_LARGE'
  | 'CSRF_REJECTED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function formatZodError(err: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
    if (!details[key]) {
      details[key] = [];
    }
    details[key].push(issue.message);
  }
  return details;
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      { status: err.status }
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the highlighted form fields and try again.',
          details: formatZodError(err),
        },
      },
      { status: 400 }
    );
  }

  logger.error('Unhandled API error', {
    errorName: err instanceof Error ? err.name : 'Unknown',
    errorMessage: err instanceof Error ? err.message : String(err),
  });

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
    },
    { status: 500 }
  );
}
