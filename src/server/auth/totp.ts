import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(byteLength = 20): string {
  const buf = randomBytes(byteLength);
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]!;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(secret: string): Buffer {
  const cleaned = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]!);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret: string, timeMs = Date.now(), stepSeconds = 30): string {
  const key = decodeBase32(secret);
  const counter = Math.floor(timeMs / 1000 / stepSeconds);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(
  secret: string,
  code: string,
  timeMs = Date.now(),
  windowSteps = 1
): boolean {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) return false;

  const targetBuf = Buffer.from(normalized, 'utf8');
  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const candidate = generateTotpCode(secret, timeMs + offset * 30_000);
    const candidateBuf = Buffer.from(candidate, 'utf8');
    if (candidateBuf.length === targetBuf.length && timingSafeEqual(candidateBuf, targetBuf)) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUri(params: {
  issuer?: string;
  accountLabel: string;
  secret: string;
}): string {
  const issuer = params.issuer ?? 'VALUEOUS';
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    params.accountLabel
  )}?secret=${params.secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
