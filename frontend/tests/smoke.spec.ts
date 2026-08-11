import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', error => errors.push(error));
  (page as any).__runtimeErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as any).__runtimeErrors).toEqual([]);
});

test('Homepage loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Privara/);
  await expect(page.locator('h1')).toContainText('Trade FXRP without exposing your unmatched order terms.');
  await expect(page.getByRole('main').getByRole('link', { name: /Launch App/ })).toBeVisible();
});

test('Navigation works', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: /Launch App/ }).click();
  await expect(page).toHaveURL('/trade');
  await expect(page.locator('h2')).toContainText('Connect Your Wallet'); // Trade page should ask to connect wallet
});

test('Portfolio page requires connection', async ({ page }) => {
  await page.goto('/portfolio');
  await expect(page.locator('h2')).toContainText('Connect Your Wallet');
});

test('Trade route keeps financial controls behind wallet connection', async ({ page }) => {
  await page.goto('/trade');
  await expect(page.getByRole('heading', { name: 'Connect Your Wallet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Place Order' })).toHaveCount(0);
});

test('Manage assets supports direct deposit and withdrawal routes', async ({ page }) => {
  await page.goto('/deposit');
  await expect(page.getByRole('heading', { name: 'Manage Vault Assets' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deposit', exact: true })).toBeVisible();

  await page.goto('/deposit?action=withdraw');
  await expect(page.getByRole('button', { name: 'Withdraw', exact: true })).toBeVisible();
  await expect(page.getByText('Available', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Locked', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Total', { exact: true }).first()).toBeVisible();
});
