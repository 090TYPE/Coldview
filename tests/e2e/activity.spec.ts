import { test, expect } from '@playwright/test';

test('add an EVM address, open Activity, see a transfer with USD@time', async ({ page }) => {
  // Register the general address route FIRST so the specific ones (added after) win.
  await page.route('**/api/v2/addresses/*', (route) => route.fulfill({ json: { coin_balance: '0' } }));
  await page.route('**/api/v2/addresses/*/token-balances', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v2/addresses/*/token-transfers', (route) =>
    route.fulfill({ json: { items: [
      { from: { hash: '0xsender' }, to: { hash: '0x' + 'a'.repeat(40) }, token: { address: '0xUSDC', symbol: 'USDC', decimals: '6' }, total: { value: '3120000000' }, tx_hash: '0xt1', timestamp: '2026-06-01T00:00:00Z' },
    ] } }),
  );
  await page.route('**/api/v2/addresses/*/transactions', (route) => route.fulfill({ json: { items: [] } }));
  await page.route('**/coins.llama.fi/prices/current/**', (route) => route.fulfill({ json: { coins: {} } }));
  await page.route('**/coins.llama.fi/prices/historical/**', (route) =>
    route.fulfill({ json: { coins: { 'ethereum:0xusdc': { price: 1 } } } }),
  );

  await page.goto('/');
  await page.getByPlaceholder(/address or ens/i).fill('0x' + 'a'.repeat(40));
  await page.getByRole('button', { name: /add/i }).click();

  await page.getByRole('button', { name: /activity/i }).click();
  await expect(page.getByText('USDC').first()).toBeVisible();
  await expect(page.getByText('$3,120').first()).toBeVisible();
});
