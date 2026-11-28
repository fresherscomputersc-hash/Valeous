import { and, desc, eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { getDb, type DbExecutor } from '@/server/db';
import {
  commissionRecords,
  commissionRules,
  ledgerAccounts,
  ledgerEntries,
  ledgerTransactions,
  reconciliationItems,
} from '@/server/db/schema';

export type LedgerDirection = 'D' | 'C';

export interface LedgerEntryDraft {
  accountCode: string;
  accountType: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE' | 'CONTRA' | 'MEMO';
  ownerType: 'PLATFORM' | 'ORGANISATION' | 'CREATOR';
  ownerId: string;
  direction: LedgerDirection;
  amountPaise: number;
  memo?: string;
}

export function calculateCommissionSplit(
  eligibleNetPaise: number,
  rateBps = 1000,
  creatorShareBps = 4000
) {
  if (!Number.isInteger(eligibleNetPaise) || eligibleNetPaise < 0) {
    throw new AppError('VALIDATION_ERROR', 'eligibleNetPaise must be a non-negative integer', 400);
  }
  const totalCommissionPaise = Math.round((eligibleNetPaise * rateBps) / 10_000);
  const creatorPaise = Math.round((totalCommissionPaise * creatorShareBps) / 10_000);
  const platformPaise = totalCommissionPaise - creatorPaise;
  const businessNetPaise = eligibleNetPaise - totalCommissionPaise;

  return {
    eligibleNetPaise,
    totalCommissionPaise,
    creatorPaise,
    platformPaise,
    businessNetPaise,
  };
}

async function ensureLedgerAccount(
  tx: DbExecutor,
  params: {
    code: string;
    type: string;
    ownerType: string;
    ownerId: string;
  }
): Promise<string> {
  const [existing] = await tx
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.code, params.code),
        eq(ledgerAccounts.ownerType, params.ownerType),
        eq(ledgerAccounts.ownerId, params.ownerId)
      )
    )
    .limit(1);

  if (existing) return existing.id;

  const [created] = await tx
    .insert(ledgerAccounts)
    .values({
      code: params.code,
      type: params.type,
      ownerType: params.ownerType,
      ownerId: params.ownerId,
    })
    .onConflictDoNothing()
    .returning({ id: ledgerAccounts.id });

  if (created) return created.id;

  const [retried] = await tx
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.code, params.code),
        eq(ledgerAccounts.ownerType, params.ownerType),
        eq(ledgerAccounts.ownerId, params.ownerId)
      )
    )
    .limit(1);

  return retried!.id;
}

export async function postBalancedLedgerTransaction(
  params: {
    bookingId?: string | null;
    kind: string;
    reversalOfId?: string | null;
    entries: LedgerEntryDraft[];
  },
  txOrDb?: DbExecutor
) {
  if (params.entries.length < 2) {
    throw new AppError('LEDGER_IMBALANCE', 'A ledger transaction requires at least 2 entries.', 400);
  }

  let debitSum = 0;
  let creditSum = 0;
  for (const entry of params.entries) {
    if (!Number.isInteger(entry.amountPaise) || entry.amountPaise <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Ledger entry amountPaise must be a positive integer.', 400);
    }
    if (entry.direction === 'D') debitSum += entry.amountPaise;
    else creditSum += entry.amountPaise;
  }

  if (debitSum !== creditSum) {
    throw new AppError(
      'LEDGER_IMBALANCE',
      `Double-entry invariant violated: Debits (${debitSum}) != Credits (${creditSum}).`,
      400
    );
  }

  const execute = async (tx: DbExecutor) => {
    const [txRow] = await tx
      .insert(ledgerTransactions)
      .values({
        bookingId: params.bookingId ?? null,
        kind: params.kind,
        reversalOfId: params.reversalOfId ?? null,
        balanced: true,
      })
      .returning();

    const insertedEntries = [];
    for (const draft of params.entries) {
      const accountId = await ensureLedgerAccount(tx, {
        code: draft.accountCode,
        type: draft.accountType,
        ownerType: draft.ownerType,
        ownerId: draft.ownerId,
      });

      const [entryRow] = await tx
        .insert(ledgerEntries)
        .values({
          transactionId: txRow!.id,
          accountId,
          direction: draft.direction,
          amountPaise: draft.amountPaise,
          currency: 'INR',
          memo: draft.memo ?? null,
        })
        .returning();

      insertedEntries.push(entryRow!);
    }

    return { transaction: txRow!, entries: insertedEntries };
  };

  if (txOrDb) return execute(txOrDb);
  return getDb().transaction(execute);
}

export async function postBookingPaymentLedger(
  params: {
    bookingId: string;
    organisationId: string;
    creatorId?: string | null;
    eligibleNetPaise: number;
    taxPaise?: number;
    rateBps?: number;
    creatorShareBps?: number;
  },
  txOrDb?: DbExecutor
) {
  const taxPaise = params.taxPaise ?? 0;
  const totalCollectedPaise = params.eligibleNetPaise + taxPaise;
  const split = calculateCommissionSplit(
    params.eligibleNetPaise,
    params.rateBps ?? 1000,
    params.creatorShareBps ?? 4000
  );

  const entries: LedgerEntryDraft[] = [
    {
      accountCode: 'PAYMENT_CLEARING',
      accountType: 'ASSET',
      ownerType: 'PLATFORM',
      ownerId: 'platform',
      direction: 'D',
      amountPaise: totalCollectedPaise,
      memo: `Payment captured for booking ${params.bookingId}`,
    },
    {
      accountCode: 'BUSINESS_PAYABLE',
      accountType: 'LIABILITY',
      ownerType: 'ORGANISATION',
      ownerId: params.organisationId,
      direction: 'C',
      amountPaise: split.businessNetPaise,
      memo: 'Business net payable after commission',
    },
  ];

  if (taxPaise > 0) {
    entries.push({
      accountCode: 'TAX_PAYABLE',
      accountType: 'LIABILITY',
      ownerType: 'PLATFORM',
      ownerId: 'platform',
      direction: 'C',
      amountPaise: taxPaise,
      memo: 'Applicable tax held',
    });
  }

  if (split.platformPaise > 0) {
    entries.push({
      accountCode: 'PLATFORM_COMMISSION_REVENUE',
      accountType: 'REVENUE',
      ownerType: 'PLATFORM',
      ownerId: 'platform',
      direction: 'C',
      amountPaise: split.platformPaise,
      memo: 'Platform retained commission',
    });
  }

  if (split.creatorPaise > 0) {
    entries.push({
      accountCode: 'CREATOR_COMMISSION_PAYABLE',
      accountType: 'LIABILITY',
      ownerType: params.creatorId ? 'CREATOR' : 'PLATFORM',
      ownerId: params.creatorId ?? 'platform',
      direction: 'C',
      amountPaise: split.creatorPaise,
      memo: 'Attributed creator commission share',
    });
  }

  const execute = async (tx: DbExecutor) => {
    const ledgerResult = await postBalancedLedgerTransaction(
      {
        bookingId: params.bookingId,
        kind: 'BOOKING_PAYMENT_CAPTURED',
        entries,
      },
      tx
    );

    const [rule] = await tx
      .select()
      .from(commissionRules)
      .orderBy(desc(commissionRules.priority))
      .limit(1);

    await tx.insert(commissionRecords).values({
      bookingId: params.bookingId,
      ruleId: rule?.id ?? null,
      basePaise: params.eligibleNetPaise,
      platformPaise: split.platformPaise,
      creatorPaise: split.creatorPaise,
      status: 'PENDING',
    });

    return { ledgerResult, split };
  };

  if (txOrDb) return execute(txOrDb);
  return getDb().transaction(execute);
}

export async function reverseBookingLedger(
  params: {
    bookingId: string;
    organisationId: string;
    refundPaise: number;
    reversalOfTxId?: string | null;
  },
  txOrDb?: DbExecutor
) {
  return postBalancedLedgerTransaction(
    {
      bookingId: params.bookingId,
      kind: 'BOOKING_REFUND_REVERSAL',
      reversalOfId: params.reversalOfTxId ?? null,
      entries: [
        {
          accountCode: 'REFUNDS_CONTRA',
          accountType: 'CONTRA',
          ownerType: 'PLATFORM',
          ownerId: 'platform',
          direction: 'D',
          amountPaise: params.refundPaise,
          memo: `Refund reversal for booking ${params.bookingId}`,
        },
        {
          accountCode: 'PAYMENT_CLEARING',
          accountType: 'ASSET',
          ownerType: 'PLATFORM',
          ownerId: 'platform',
          direction: 'C',
          amountPaise: params.refundPaise,
          memo: `Refund payout from clearing for booking ${params.bookingId}`,
        },
      ],
    },
    txOrDb
  );
}

export async function runDailyReconciliation(
  source: string,
  providerItems: Array<{ reference: string; amountPaise: number }>
) {
  const db = getDb();
  const clearingEntries = await db
    .select({
      entry: ledgerEntries,
      account: ledgerAccounts,
    })
    .from(ledgerEntries)
    .innerJoin(ledgerAccounts, eq(ledgerEntries.accountId, ledgerAccounts.id))
    .where(and(eq(ledgerAccounts.code, 'PAYMENT_CLEARING'), eq(ledgerEntries.direction, 'D')));

  const results = [];
  for (const item of providerItems) {
    const match = clearingEntries.find((ce) =>
      (ce.entry.memo ?? '').includes(item.reference)
    );

    let status: 'MATCHED' | 'MISSING' | 'VARIANCE' = 'MISSING';
    let variancePaise = item.amountPaise;
    if (match) {
      variancePaise = item.amountPaise - match.entry.amountPaise;
      status = variancePaise === 0 ? 'MATCHED' : 'VARIANCE';
    }

    const [row] = await db
      .insert(reconciliationItems)
      .values({
        source,
        reference: item.reference,
        matchedEntryId: match?.entry.id ?? null,
        status,
        variancePaise,
      })
      .returning();

    results.push(row!);
  }

  return results;
}
