// Keyless FX rates (USD base). open.er-api.com returns { rates: { EUR: .., ... } }.
export function parseFxRates(raw: unknown): Record<string, number> {
  const rates = (raw as { rates?: Record<string, number> })?.rates;
  return rates && typeof rates === 'object' ? { ...rates, USD: 1 } : { USD: 1 };
}

export async function fetchFxRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) return { USD: 1 };
    return parseFxRates(await res.json());
  } catch {
    return { USD: 1 };
  }
}

// Currencies offered in the switcher (must exist in the rates response).
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'RUB', 'INR', 'BRL', 'CAD', 'AUD', 'CHF', 'KRW'] as const;
