import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { getDb, type DbExecutor } from '@/server/db';
import { notifications, users } from '@/server/db/schema';
import { sendTransactionalEmail } from '@/server/services/email.service';

export async function createUserNotification(
  params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    href?: string;
    sendEmail?: boolean;
  },
  tx?: DbExecutor
): Promise<void> {
  const db = tx ?? getDb();
  const href = params.href || '/';

  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    href,
  });

  if (params.sendEmail) {
    try {
      const [u] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);

      if (u) {
        const env = getEnv();
        await sendTransactionalEmail({
          toEmail: u.email,
          subject: `${env.NEXT_PUBLIC_APP_NAME} — ${params.title}`,
          text: `${params.body}\n\nView details: ${env.APP_BASE_URL}${href}`,
          actionUrl: `${env.APP_BASE_URL}${href}`,
        });
      }
    } catch {
      // Non-blocking email dispatch
    }
  }
}

export async function notifyAllAdmins(
  params: {
    type: string;
    title: string;
    body: string;
    href?: string;
  },
  tx?: DbExecutor
): Promise<void> {
  const db = tx ?? getDb();
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'ADMIN'), eq(users.status, 'ACTIVE')));

  for (const admin of admins) {
    await createUserNotification(
      {
        userId: admin.id,
        type: params.type,
        title: params.title,
        body: params.body,
        href: params.href || '/admin',
      },
      tx
    );
  }
}

export async function listUserNotifications(userId: string, limit = 25) {
  const db = getDb();
  const [items, unreadRows] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit),
    db
      .select({
        unreadCount: sql<number>`count(*)`,
      })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
  ]);

  return {
    unreadCount: unreadRows[0]?.unreadCount ?? 0,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      readAt: n.readAt ?? null,
      createdAt: n.createdAt,
    })),
  };
}

export async function markNotificationsRead(userId: string, notificationId?: string) {
  const db = getDb();
  const now = new Date().toISOString();
  if (notificationId) {
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(eq(notifications.id, notificationId), eq(notifications.userId, userId))
      );
  } else {
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  }
}
