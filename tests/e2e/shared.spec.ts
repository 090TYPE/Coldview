import { test, expect } from '@playwright/test';

// A #share= link should open a read-only view of that portfolio without the
// viewer having to add any wallet of their own.
const SHARE = 'eyJ3IjpbeyJhIjoiMHhhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIiwibCI6Ik1haW4ifV0sImMiOlsiYXJiaXRydW0iXX0';

test('opening a share link shows a read-only portfolio', async ({ page }) => {
  await page.route('**/api/v2/addresses/*', (route) => route.fulfill({ json: { coin_balance: '0' } }));
  await page.route('**/api/v2/addresses/*/token-balances', (route) =>
    route.fulfill({ json: [{ token: { address_hash: '0xARB', symbol: 'ARB', decimals: '18', type: 'ERC-20', exchange_rate: '2' }, value: '1000000000000000000' }] }),
  );
  await page.route('**/coins.llama.fi/**', (route) => route.fulfill({ json: { coins: { 'arbitrum:0xarb': { price: 2 } } } }));

  await page.goto(`/#share=${SHARE}`);

  await expect(page.getByText(/shared · read-only/i)).toBeVisible();
  await expect(page.getByText('ARB').first()).toBeVisible();
  // Read-only: no "add wallet" affordance.
  await expect(page.getByRole('button', { name: /^\+ add$/i })).toHaveCount(0);
});
