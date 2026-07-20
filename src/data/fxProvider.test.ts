import { describe, it, expect } from 'vitest';
import { parseFxRates } from './fxProvider';

describe('parseFxRates', () => {
  it('extracts the rates map and pins USD to 1', () => {
    expect(parseFxRates({ rates: { EUR: 0.9, GBP: 0.8 } })).toEqual({ EUR: 0.9, GBP: 0.8, USD: 1 });
  });
  it('falls back to USD-only on a malformed response', () => {
    expect(parseFxRates({})).toEqual({ USD: 1 });
    expect(parseFxRates(null)).toEqual({ USD: 1 });
  });
});
