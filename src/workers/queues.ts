import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getEnv } from '@/lib/env';

export const VALUEOUS_QUEUE_NAME = 'valueous-jobs';

export type ValueousJobData =
  | { kind: 'test-delayed'; message: string; enqueuedAt: string }
  | { kind: 'reservation-expiry'; reservationId: string }
  | { kind: 'webhook-retry'; provider: string; eventId: string };

export function createRedisConnection(): IORedis {
  const env = getEnv();
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function createValueousQueue(connection = createRedisConnection()): Queue<ValueousJobData> {
  return new Queue<ValueousJobData>(VALUEOUS_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });
}

export async function enqueueTestDelayedJob(
  message: string,
  delayMs = 500
): Promise<{ jobId: string | undefined }> {
  const connection = createRedisConnection();
  const queue = createValueousQueue(connection);
  try {
    const job = await queue.add(
      'test-delayed',
      { kind: 'test-delayed', message, enqueuedAt: new Date().toISOString() },
      { delay: delayMs }
    );
    return { jobId: job.id };
  } finally {
    await queue.close();
    await connection.quit();
  }
}
