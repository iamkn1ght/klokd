/**
 * Klokd API Load Test — k6 script
 * Target: 80 virtual users, 30-minute sustained load
 *
 * Run: k6 run tests/load/k6-load-test.js
 *
 * Thresholds:
 *   - 95% of requests under 500ms
 *   - Error rate under 1%
 *   - Health check always under 200ms
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

const errorRate = new Rate('errors');
const shiftLatency = new Trend('shift_latency', true);

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up
    { duration: '5m', target: 40 },   // Hold 40
    { duration: '5m', target: 80 },   // Ramp to 80 VUs
    { duration: '15m', target: 80 },  // Sustained 80 VUs
    { duration: '3m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
    'http_req_duration{name:health}': ['p(99)<200'],
  },
};

// Simulated JWT token (in real test, get from /auth/otp/verify)
const WORKER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJsb2FkLXRlc3Qtd29ya2VyIiwicm9sZSI6IldPUktFUiIsInRlbmFudElkIjoia2xva2Qta2UtZGVmYXVsdCJ9.placeholder';
const EMPLOYER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJsb2FkLXRlc3QtZW1wbG95ZXIiLCJyb2xlIjoiRU1QTE9ZRVIiLCJ0ZW5hbnRJZCI6Imtsb2tkLWtlLWRlZmF1bHQifQ.placeholder';

const headers = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

export default function () {
  // 1. Health check (every VU, every iteration)
  const healthRes = http.get(`${BASE_URL}/health`, { tags: { name: 'health' } });
  check(healthRes, {
    'health: status 200': (r) => r.status === 200,
    'health: body ok': (r) => JSON.parse(r.body).status === 'ok',
  });
  errorRate.add(healthRes.status !== 200);

  // 2. Worker: browse available shifts
  const shiftsRes = http.get(
    `${BASE_URL}/api/v1/shifts/available?lat=-1.2640&lng=36.8040&radiusKm=5`,
    { headers: headers(WORKER_TOKEN), tags: { name: 'shifts_available' } }
  );
  shiftLatency.add(shiftsRes.timings.duration);
  errorRate.add(shiftsRes.status >= 400);

  sleep(1);

  // 3. Compliance: calculate deductions
  const compRes = http.post(
    `${BASE_URL}/api/v1/compliance/calculate`,
    JSON.stringify({ grossKes: 1800 }),
    { headers: headers(WORKER_TOKEN), tags: { name: 'compliance_calc' } }
  );
  errorRate.add(compRes.status >= 400);

  // 4. Simulate shift detail view
  const detailRes = http.get(
    `${BASE_URL}/api/v1/shifts/nonexistent-id`,
    { headers: headers(WORKER_TOKEN), tags: { name: 'shift_detail' } }
  );
  // 404 is expected for nonexistent, not an error
  check(detailRes, {
    'shift detail: responds': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.5);

  // 5. Minimum wage validation
  const minWageRes = http.post(
    `${BASE_URL}/api/v1/compliance/minwage/validate`,
    JSON.stringify({ sector: 'hospitality', location: 'nairobi', proposedRate: 1800 }),
    { headers: headers(EMPLOYER_TOKEN), tags: { name: 'minwage_validate' } }
  );
  errorRate.add(minWageRes.status >= 400);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'tests/load/results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, opts) {
  // k6 built-in summary is used automatically
  return '';
}
