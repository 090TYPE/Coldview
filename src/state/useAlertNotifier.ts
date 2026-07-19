import { useEffect } from 'react';
import { useAppStore } from './store';
import { evaluateAlerts } from '../data/alerts';
import type { Holding } from '../data/types';

// Checks armed alerts against live holding prices whenever they refresh. Fires a
// browser notification (if permitted) and marks each one triggered (one-shot).
// Client-only: this only runs while Coldview is open — there's no push server.
export function useAlertNotifier(holdings: Holding[]) {
  const alerts = useAppStore((s) => s.alerts);
  const setAlertTriggered = useAppStore((s) => s.setAlertTriggered);

  useEffect(() => {
    if (holdings.length === 0 || !alerts.some((a) => !a.triggered)) return;
    const priceBySymbol: Record<string, number> = {};
    for (const h of holdings) {
      if (h.priceUsd != null && priceBySymbol[h.symbol.toUpperCase()] === undefined) {
        priceBySymbol[h.symbol.toUpperCase()] = h.priceUsd;
      }
    }
    for (const a of evaluateAlerts(alerts, priceBySymbol)) {
      const price = priceBySymbol[a.symbol.toUpperCase()];
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Coldview price alert', {
          body: `${a.symbol} is ${a.direction} $${a.target.toLocaleString()} — now $${price.toLocaleString()}`,
        });
      }
      setAlertTriggered(a.id, true); // in-app badge is the fallback when notifications are off
    }
  }, [holdings, alerts, setAlertTriggered]);
}
