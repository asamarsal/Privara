# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Portfolio page requires connection
- Location: tests\smoke.spec.ts:17:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h2')
Expected substring: "Connect Your Wallet"
Received string:    "Application error: a client-side exception has occurred (see the browser console for more information)."
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h2')
    13 × locator resolved to <h2>Application error: a client-side exception has oc…</h2>
       - unexpected value "Application error: a client-side exception has occurred (see the browser console for more information)."

```

```yaml
- 'heading "Application error: a client-side exception has occurred (see the browser console for more information)." [level=2]'
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Homepage loads correctly', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   await expect(page).toHaveTitle(/Privara/);
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
> 19 |   await expect(page.locator('h2')).toContainText('Connect Your Wallet');
     |                                    ^ Error: expect(locator).toContainText(expected) failed
  20 | });
  21 | 
```