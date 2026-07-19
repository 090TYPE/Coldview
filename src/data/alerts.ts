export interface Alert {
  id: string;
  symbol: string;               // upper-cased token symbol
  direction: 'above' | 'below';
  target: number;               // USD
  triggered: boolean;           // one-shot: stops firing until re-armed
}

const ALERTS_KEY = 'coldview:alerts';

export function loadAlerts(): Alert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    const arr = raw ? (JSON.parse(raw) as Alert[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: Alert[]): void {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

// Returns the armed alerts whose condition is currently satisfied by live prices.
export function evaluateAlerts(alerts: Alert[], priceBySymbol: Record<string, number>): Alert[] {
  return alerts.filter((a) => {
    if (a.triggered) return false;
    const p = priceBySymbol[a.symbol.toUpperCase()];
    if (p === undefined) return false;
    return a.direction === 'above' ? p >= a.target : p <= a.target;
  });
}
