import { test, expect } from '@playwright/test';

const OWNER = '0x' + 'a'.repeat(40);

test('P&L tab computes FIFO cost basis from history', async ({ page }) => {
  await page.route('**/api/v2/addresses/*/token-balances', (route) =>
    route.fulfill({ json: [{ token: { address_hash: '0xARB', symbol: 'ARB', decimals: '18', type: 'ERC-20', exchange_rate: '2' }, value: '1000000000000000000' }] }),
  );
  await page.route('**/api/v2/addresses/*/token-transfers', (route) =>
    route.fulfill({
      json: {
        items: [
          { from: { hash: '0xsender0000000000000000000000000000000001' }, to: { hash: OWNER }, token: { address: '0xARB', symbol: 'ARB', decimals: '18' }, total: { value: '1000000000000000000' }, tx_hash: '0xbuy', timestamp: '2026-06-01T10:00:00.000000Z' },
        ],
      },
    }),
  );
  await page.route('**/api/v2/addresses/*/transactions', (route) => route.fulfill({ json: { items: [] } }));
  await page.route('**/api/v2/addresses/*', (route) => route.fulfill({ json: { coin_balance: '0' } }));
  // Both current and historical price lookups hit coins.llama.fi and share this shape.
  await page.route('**/coins.llama.fi/**', (route) => route.fulfill({ json: { coins: { 'arbitrum:0xarb': { price: 2 } } } }));

  await page.goto('/');
  await page.getByPlaceholder(/address or ens/i).fill(OWNER);
  await page.getByRole('button', { name: /add/i }).click();
  await expect(page.getByText('ARB').first()).toBeVisible();

  await page.getByRole('button', { name: 'P&L' }).click();
  await expect(page.getByText('Unrealized P&L', { exact: true })).toBeVisible();
  await expect(page.getByText('Realized P&L', { exact: true })).toBeVisible();
  await expect(page.getByText('ARB').first()).toBeVisible();
});
