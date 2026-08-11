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
  await expect(page.locator('h1')).toContainText('Trade FXRP', { timeout: 10_000 });
  await expect(page.getByRole('main').getByRole('link', { name: /Launch App/ })).toBeVisible();
});

test('Navigation opens the disconnected read-only trade interface', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: /Launch App/ }).click();
  await expect(page).toHaveURL('/trade');
  await expect(page.getByText('Wallet not connected.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review & Submit Private Order' })).toBeVisible();
});

test('Portfolio remains visible while disconnected and guards vault actions', async ({ page }) => {
  await page.goto('/portfolio');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Wallet not connected.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vault Holdings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Active Orders' })).toBeVisible();

  await page.getByRole('button', { name: 'Manage Vault' }).click();
  await expect(page.getByRole('heading', { name: 'Deposit Tokens' })).toBeVisible();
  await page.getByRole('button', { name: 'Deposit FXRP' }).click();
  await expect(page.getByText('Connect a wallet on Coston2', { exact: true })).toBeVisible();
});

test('Trade remains visible while disconnected and guards order actions', async ({ page }) => {
  await page.goto('/trade');
  await expect(page.getByText('Wallet not connected.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Classic' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Advanced' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review & Submit Private Order' })).toBeVisible();

  await page.getByRole('button', { name: 'Review & Submit Private Order' }).click();
  await expect(page.getByText('Harap hubungkan wallet')).toBeVisible();

  await page.getByRole('button', { name: 'Advanced' }).click();
  await expect(page.getByRole('button', { name: 'Market' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Limit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Place Order' })).toBeVisible();
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
