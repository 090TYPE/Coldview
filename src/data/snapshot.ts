import { get, set } from 'idb-keyval';

export const HOUR_MS = 60 * 60 * 1000;
const STORE_KEY = 'coldview:snapshots';

export interface SnapshotPoint {
  t: number; // epoch ms
  v: number; // total value USD
}

export function shouldAppend(lastTs: number | null, now: number): boolean {
  if (lastTs === null) return true;
  return now - lastTs >= HOUR_MS;
}

export async function getSnapshots(): Promise<SnapshotPoint[]> {
  return (await get<SnapshotPoint[]>(STORE_KEY)) ?? [];
}

export async function appendSnapshot(totalValueUsd: number, now: number = Date.now()): Promise<void> {
  const series = await getSnapshots();
  const last = series.length ? series[series.length - 1].t : null;
  if (!shouldAppend(last, now)) return;
  series.push({ t: now, v: totalValueUsd });
  await set(STORE_KEY, series);
}
