export interface EnsResult {
  address: string;
  name: string | null;
  avatar: string | null;
}

export function looksLikeEnsName(s: string): boolean {
  const v = s.trim();
  if (!v || v.startsWith('0x')) return false;
  return /^[^\s.]+\.[^\s.]+(\.[^\s.]+)*$/.test(v); // at least one dot, no spaces
}

export async function resolveEns(nameOrAddress: string): Promise<EnsResult | null> {
  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(nameOrAddress.trim())}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: string | null; name?: string | null; avatar?: string | null };
    if (!data.address) return null;
    return { address: data.address.toLowerCase(), name: data.name ?? null, avatar: data.avatar ?? null };
  } catch {
    return null;
  }
}
