import AsyncStorage from '@react-native-async-storage/async-storage';
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
const STORE_KEY = 'stayodds_guest_ranks_v1';
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // refresh from the website at most twice a day

function fetchFresh(): Promise<RanksPayload | null> {
  if (!inFlight) {
    inFlight = fetch(`${LIVE_BASE_URL}/data/guest-ranks.json`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? (r.json() as Promise<RanksPayload>) : null))
      .then((d) => {
        if (d) {
          cache = d;
          AsyncStorage.setItem(STORE_KEY, JSON.stringify({ savedAt: Date.now(), data: d })).catch(() => {});
        }
        return d || cache;
      })
      .catch(() => cache)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Saved copy on the phone first (instant, works offline); download again only when it is over 12 hours old. */
export async function loadGuestRanks(): Promise<RanksPayload | null> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { savedAt: number; data: RanksPayload };
      cache = saved.data;
      if (Date.now() - saved.savedAt > MAX_AGE_MS) fetchFresh();
      return cache;
    }
  } catch {
    // no saved copy; fall through
  }
  return fetchFresh();
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`;
}
