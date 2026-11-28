import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * VALUEOUS Checkout, Availability & Search Load Test (VLS-212)
 *
 * Usage example:
 *   k6 run -e BASE_URL=http://localhost:3000 \
 *          -e TEST_SERVICE_ID=<uuid> \
 *          -e TEST_SLOT_ID=<uuid> \
 *          -e TEST_ORG_ID=<uuid> \
 *          tests/load/checkout.k6.js
 */

const searchLatencyMs = new Trend('valueous_search_latency_ms', true);
const availabilityLatencyMs = new Trend('valueous_availability_latency_ms', true);
const reservationLatencyMs = new Trend('valueous_reservation_latency_ms', true);
const unexpectedFailures = new Rate('valueous_unexpected_failures');

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TEST_SERVICE_ID = __ENV.TEST_SERVICE_ID || '';
const TEST_SLOT_ID = __ENV.TEST_SLOT_ID || '';
const TEST_ORG_ID = __ENV.TEST_ORG_ID || '';
const TOTAL_PAISE = Number(__ENV.TEST_TOTAL_PAISE || '180000');

export const options = {
  stages: [
    { duration: __ENV.RAMP_UP || '15s', target: Number(__ENV.VUS || '10') },
    { duration: __ENV.STEADY || '30s', target: Number(__ENV.VUS || '25') },
    { duration: __ENV.RAMP_DOWN || '10s', target: 0 },
  ],
  thresholds: {
    valueous_unexpected_failures: ['rate<0.02'],
    valueous_search_latency_ms: ['p(95)<500'],
    valueous_availability_latency_ms: ['p(95)<500'],
    valueous_reservation_latency_ms: ['p(95)<1000'],
  },
};

export function setup() {
  const email = __ENV.LOAD_CUSTOMER_EMAIL || `k6.customer.${Date.now()}@load.local`;
  const password = __ENV.LOAD_CUSTOMER_PASSWORD || 'LoadTestPass123!';

  const regRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      role: 'CUSTOMER',
      displayName: 'K6 Load Customer',
      email,
      password,
      city: 'Bhubaneswar',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Origin: BASE_URL,
      },
    }
  );

  if (regRes.status === 201 || regRes.status === 200) {
    const body = regRes.json();
    return { sessionToken: body?.sessionToken || '' };
  }

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        Origin: BASE_URL,
      },
    }
  );

  const loginBody = loginRes.status === 200 ? loginRes.json() : null;
  return { sessionToken: loginBody?.sessionToken || '' };
}

export default function (data) {
  group('Discovery Search', () => {
    const res = http.get(`${BASE_URL}/api/v1/search?q=Facial&city=Bhubaneswar&limit=20`);
    searchLatencyMs.add(res.timings.duration);
    const ok = check(res, {
      'search returns 200': (r) => r.status === 200,
    });
    unexpectedFailures.add(!ok);
  });

  if (TEST_SERVICE_ID) {
    group('Availability Check', () => {
      const res = http.get(
        `${BASE_URL}/api/v1/availability?itemType=service&itemId=${encodeURIComponent(TEST_SERVICE_ID)}`
      );
      availabilityLatencyMs.add(res.timings.duration);
      const ok = check(res, {
        'availability returns 200': (r) => r.status === 200,
      });
      unexpectedFailures.add(!ok);
    });
  }

  if (TEST_SLOT_ID && data?.sessionToken) {
    group('Reservation Hold & Checkout', () => {
      const idemKey = `k6-${__VU}-${__ITER}-${Date.now()}`;
      const holdRes = http.post(
        `${BASE_URL}/api/v1/reservations`,
        JSON.stringify({ slotId: TEST_SLOT_ID, quantity: 1 }),
        {
          headers: {
            'Content-Type': 'application/json',
            Origin: BASE_URL,
            Authorization: `Bearer ${data.sessionToken}`,
            'Idempotency-Key': idemKey,
          },
        }
      );
      reservationLatencyMs.add(holdRes.timings.duration);

      // 201 (held) and 409 (SLOT_UNAVAILABLE under contention) are both valid deterministic outcomes
      const expectedOutcome = check(holdRes, {
        'reservation returns 201 or 409': (r) => r.status === 201 || r.status === 409,
      });
      unexpectedFailures.add(!expectedOutcome);

      if (holdRes.status === 201 && TEST_ORG_ID) {
        const reservationId = holdRes.json()?.reservation_id;
        if (reservationId) {
          const bookingRes = http.post(
            `${BASE_URL}/api/v1/bookings`,
            JSON.stringify({
              reservationId,
              organisationId: TEST_ORG_ID,
              totalPaise: TOTAL_PAISE,
              policySnapshot: { refundPercent: 100 },
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                Origin: BASE_URL,
                Authorization: `Bearer ${data.sessionToken}`,
              },
            }
          );
          const bookingOk = check(bookingRes, {
            'booking created (201)': (r) => r.status === 201,
          });
          unexpectedFailures.add(!bookingOk);
        }
      }
    });
  }

  sleep(0.2);
}
