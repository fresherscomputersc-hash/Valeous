import { getDb, type DbExecutor } from '@/server/db';
import { auditLogs } from '@/server/db/schema';
import { sanitizeForLog } from '@/lib/logger';

export interface AuditEntryInput {
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function recordAuditLog(
  input: AuditEntryInput,
  txOrDb: DbExecutor = getDb()
): Promise<void> {
  const cleanMetaRaw = sanitizeForLog(input.metadata ?? {});
  const safeMetadata: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(cleanMetaRaw)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      safeMetadata[key] = value;
    }
  }

  await txOrDb.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason ?? null,
    metadata: JSON.stringify(safeMetadata),
  });
}
