import { test, expect } from '@playwright/test';

test('loads the app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Summit Clock' })).toBeVisible();
});

test('registers a service worker', async ({ page }) => {
  await page.goto('/');
  const active = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    return !!registration.active;
  });
  expect(active).toBe(true);
});

test('still loads after going offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Summit Clock' })).toBeVisible();
  await context.setOffline(false);
});
