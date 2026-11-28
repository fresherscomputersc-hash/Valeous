import 'dotenv/config';
import { Worker, type Job } from 'bullmq';
import {
  createRedisConnection,
  VALUEOUS_QUEUE_NAME,
  type ValueousJobData,
} from './queues';

export async function processValueousJob(job: Job<ValueousJobData>) {
  const data = job.data;
  switch (data.kind) {
    case 'test-delayed':
      return {
        processed: true,
        kind: data.kind,
        message: data.message,
        processedAt: new Date().toISOString(),
      };
    case 'reservation-expiry': {
      const { expireReservationHold } = await import('@/server/services/reservation.service');
      const res = await expireReservationHold(data.reservationId);
      return {
        processed: true,
        kind: data.kind,
        reservationId: data.reservationId,
        expired: res.expired,
        processedAt: new Date().toISOString(),
      };
    }
    case 'webhook-retry':
      return {
        processed: true,
        kind: data.kind,
        provider: data.provider,
        eventId: data.eventId,
        processedAt: new Date().toISOString(),
      };
  }
}

export function startWorker(): Worker<ValueousJobData> {
  const connection = createRedisConnection();
  const worker = new Worker<ValueousJobData>(
    VALUEOUS_QUEUE_NAME,
    processValueousJob,
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[worker] Job ${job.id} (${job.data.kind}) completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

if (require.main === module || process.argv[1]?.endsWith('workers/index.ts') || process.argv[1]?.endsWith('workers\\index.ts')) {
  const worker = startWorker();
  console.log(`[worker] BullMQ worker listening on queue "${VALUEOUS_QUEUE_NAME}"`);

  const shutdown = async (signal: string) => {
    console.log(`[worker] Received ${signal}, shutting down gracefully...`);
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
