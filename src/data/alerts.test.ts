import { describe, it, expect } from 'vitest';
import { evaluateAlerts } from './alerts';
import type { Alert } from './alerts';

const a = (p: Partial<Alert>): Alert => ({ id: '1', symbol: 'ETH', direction: 'above', target: 3000, triggered: false, ...p });

describe('evaluateAlerts', () => {
  it('fires an above-alert when price reaches the target', () => {
    expect(evaluateAlerts([a({ direction: 'above', target: 3000 })], { ETH: 3100 })).toHaveLength(1);
    expect(evaluateAlerts([a({ direction: 'above', target: 3000 })], { ETH: 2900 })).toHaveLength(0);
  });
  it('fires a below-alert when price drops to the target', () => {
    expect(evaluateAlerts([a({ direction: 'below', target: 2000 })], { ETH: 1900 })).toHaveLength(1);
    expect(evaluateAlerts([a({ direction: 'below', target: 2000 })], { ETH: 2100 })).toHaveLength(0);
  });
  it('never fires an already-triggered alert or one with no known price', () => {
    expect(evaluateAlerts([a({ triggered: true })], { ETH: 9999 })).toHaveLength(0);
    expect(evaluateAlerts([a({ symbol: 'XYZ' })], { ETH: 9999 })).toHaveLength(0);
  });
});
