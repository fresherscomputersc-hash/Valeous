import { randomBytes } from 'node:crypto';

/**
 * Generates an RFC 9562 UUIDv7 (48-bit Unix epoch ms timestamp + random bits)
 * for index-friendly primary keys in PostgreSQL 17.
 */
export function uuidv7(): string {
  const bytes = randomBytes(16);
  const now = BigInt(Date.now());

  // 48-bit big-endian timestamp in ms
  bytes[0] = Number((now >> 40n) & 0xffn);
  bytes[1] = Number((now >> 32n) & 0xffn);
  bytes[2] = Number((now >> 24n) & 0xffn);
  bytes[3] = Number((now >> 16n) & 0xffn);
  bytes[4] = Number((now >> 8n) & 0xffn);
  bytes[5] = Number(now & 0xffn);

  // Version 7 (0111)
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // Variant RFC 4122/9562 (10xx)
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
