import { test, expect } from '@playwright/test';

test('add an address and see the dashboard', async ({ page }) => {
  // Mock all network so the test is deterministic and offline.
  await page.route('**/api/v2/addresses/*', (route) =>
    route.fulfill({ json: { coin_balance: '0' } }),
  );
  await page.route('**/api/v2/addresses/*/token-balances', (route) =>
    route.fulfill({ json: [{ token: { address_hash: '0xARB', symbol: 'ARB', decimals: '18', type: 'ERC-20', exchange_rate: '2' }, value: '1000000000000000000' }] }),
  );
  await page.route('**/coins.llama.fi/**', (route) =>
    route.fulfill({ json: { coins: { 'arbitrum:0xarb': { price: 2 } } } }),
  );

  await page.goto('/');
  await page.getByPlaceholder(/address or ens/i).fill('0x' + 'a'.repeat(40));
  await page.getByRole('button', { name: /add/i }).click();

  await expect(page.getByText('ARB').first()).toBeVisible();
  await expect(page.getByText('$2', { exact: false }).first()).toBeVisible();
});
