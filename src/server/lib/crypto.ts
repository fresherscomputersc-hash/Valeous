import crypto from 'node:crypto';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';
import { getEnv } from '@/lib/env';

const CROCKFORD_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes ambiguous 0/O/1/I

export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2Hash(plainPassword, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPassword(passwordHash: string, plainPassword: string): Promise<boolean> {
  try {
    return await argon2Verify(passwordHash, plainPassword);
  } catch {
    return false;
  }
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

export function generateOpaqueToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}

export function normalizeClaimCode(rawCode: string): string {
  return rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateClaimCode(): {
  plainCode: string;
  codeHash: string;
  codeLast4: string;
} {
  // 12 characters from 32-symbol unambiguous alphabet = 60 bits of cryptographic randomness
  const bytes = crypto.randomBytes(12);
  let chars = '';
  for (let i = 0; i < 12; i++) {
    const byte = bytes[i] ?? 0;
    chars += CROCKFORD_ALPHABET[byte % CROCKFORD_ALPHABET.length];
  }

  const plainCode = `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
  const codeHash = hashClaimCode(plainCode);
  const codeLast4 = chars.slice(8, 12);

  return { plainCode, codeHash, codeLast4 };
}

export function hashClaimCode(rawCode: string): string {
  const normalized = normalizeClaimCode(rawCode);
  const env = getEnv();
  return crypto
    .createHmac('sha256', env.CLAIM_CODE_SECRET)
    .update(normalized, 'utf8')
    .digest('hex');
}

export interface SignedSessionCookie {
  sid: string;
  tok: string;
}

function getSessionSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export async function signSessionCookie(
  payload: SignedSessionCookie,
  expiresAt: Date
): Promise<string> {
  return new SignJWT({ sid: payload.sid, tok: payload.tok })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSessionSecretBytes());
}

export async function verifySessionCookie(cookieValue: string): Promise<SignedSessionCookie | null> {
  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecretBytes(), {
      algorithms: ['HS256'],
    });
    if (typeof payload.sid !== 'string' || typeof payload.tok !== 'string') {
      return null;
    }
    return { sid: payload.sid, tok: payload.tok };
  } catch {
    return null;
  }
}
