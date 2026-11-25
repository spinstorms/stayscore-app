import { LIVE_BASE_URL } from './api';

/** Guest ranks and better-rated alternatives, computed by the website build (data/guest-ranks.json). */
export interface RankEntry {
  rank: number;
  of: number;
  group: string;
  top: string;
  topScore: number;
  low: number;
  where?: string;
}

export interface HotelRanks {
  area?: RankEntry;
  price?: RankEntry;
}

export interface Alternative {
  id: string;
  name: string;
  g: number;
  rc: number;
  band: string;
}

interface RanksPayload {
  updatedAt: string;
  ranks: Record<string, HotelRanks>;
  alternatives: Record<string, Alternative[]>;
}

let cache: RanksPayload | null = null;
let inFlight: Promise<RanksPayload | null> | null = null;

export async function loadGuestRanks(): Promise<RanksPayload | null> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = fetch(`${LIVE_BASE_URL}/data/guest-ranks.json`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? (r.json() as Promise<RanksPayload>) : null))
      .then((d) => {
        cache = d;
        return d;
      })
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`;
}
