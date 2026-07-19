import { test, expect } from '@playwright/test';

test('add a Solana address and see a SOL holding', async ({ page }) => {
  // Mock the Solana RPC (POST) and DefiLlama price.
  await page.route('**/solana-rpc.publicnode.com/**', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    if (body.method === 'getBalance') {
      await route.fulfill({ json: { jsonrpc: '2.0', id: 1, result: { value: 2000000000 } } });
    } else {
      await route.fulfill({ json: { jsonrpc: '2.0', id: 1, result: { value: [] } } });
    }
  });
  await page.route('**/coins.llama.fi/**', (route) =>
    route.fulfill({ json: { coins: { 'coingecko:solana': { price: 150, symbol: 'SOL' } } } }),
  );

  await page.goto('/');
  await page.getByPlaceholder(/address or ens/i).fill('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs');
  await page.getByRole('button', { name: /add/i }).click();

  await expect(page.getByText('SOL').first()).toBeVisible();
  await expect(page.getByText('$300', { exact: false }).first()).toBeVisible(); // 2 SOL * $150
});
