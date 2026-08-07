# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Homepage loads correctly
- Location: tests\smoke.spec.ts:3:5

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /Privara/
Received string:  "Application error: a client-side exception has occurred"
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    13 × locator resolved to <html lang="en">…</html>
       - unexpected value "Application error: a client-side exception has occurred"

```

```yaml
- 'heading "Application error: a client-side exception has occurred (see the browser console for more information)." [level=2]'
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Homepage loads correctly', async ({ page }) => {
  4  |   await page.goto('/');
> 5  |   await expect(page).toHaveTitle(/Privara/);
     |                      ^ Error: expect(page).toHaveTitle(expected) failed
  6  |   await expect(page.locator('h1')).toContainText('Trade FXRP without exposing your unmatched order terms.');
  7  |   await expect(page.locator('text=Launch Testnet App')).toBeVisible();
  8  | });
  9  | 
  10 | test('Navigation works', async ({ page }) => {
  11 |   await page.goto('/');
  12 |   await page.click('text=Launch Testnet App');
  13 |   await expect(page).toHaveURL('/trade');
  14 |   await expect(page.locator('h2')).toContainText('Connect Your Wallet'); // Trade page should ask to connect wallet
  15 | });
  16 | 
  17 | test('Portfolio page requires connection', async ({ page }) => {
  18 |   await page.goto('/portfolio');
  19 |   await expect(page.locator('h2')).toContainText('Connect Your Wallet');
  20 | });
  21 | 
```