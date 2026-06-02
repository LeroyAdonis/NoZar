import { expect, test } from '@playwright/test';

test('check register page HTTP response', async ({ request }) => {
  const resp = await request.get('/register', { timeout: 30000 });
  console.log(`Status: ${resp.status()}`);
  console.log(`Headers:`, resp.headers());
  const text = await resp.text();
  console.log(`Body length: ${text.length}`);
  console.log(`Body preview: ${text.substring(0, 500)}`);
  expect(resp.ok()).toBe(true);
});

test('check login page HTTP response', async ({ request }) => {
  const resp = await request.get('/login', { timeout: 30000 });
  console.log(`Status: ${resp.status()}`);
  const text = await resp.text();
  console.log(`Body length: ${text.length}`);
  console.log(`Body preview: ${text.substring(0, 500)}`);
  expect(resp.ok()).toBe(true);
});

test('check landing page HTTP response', async ({ request }) => {
  const resp = await request.get('/', { timeout: 30000 });
  console.log(`Status: ${resp.status()}`);
  const text = await resp.text();
  console.log(`Body length: ${text.length}`);
  console.log(`Body preview: ${text.substring(0, 500)}`);
  expect(resp.ok()).toBe(true);
});
