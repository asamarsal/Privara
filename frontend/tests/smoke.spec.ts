import { test, expect } from '@playwright/test';

test('Homepage loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Privara/);
  await expect(page.locator('h1')).toContainText('Trade FXRP without exposing your unmatched order terms.');
  await expect(page.locator('text=Launch Testnet App')).toBeVisible();
});

test('Navigation works', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Launch Testnet App');
  await expect(page).toHaveURL('/trade');
  await expect(page.locator('h2')).toContainText('Connect Your Wallet'); // Trade page should ask to connect wallet
});

test('Portfolio page requires connection', async ({ page }) => {
  await page.goto('/portfolio');
  await expect(page.locator('h2')).toContainText('Connect Your Wallet');
});
