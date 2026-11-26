import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Data behind stayodds.com/insights/. The website build computes it from the whole directory and
 * embeds it in the page (`const D = {...};`), so the app reads the same numbers from there rather
 * than recomputing them. Saved on the phone and refreshed at most twice a day.
 */
export const INSIGHTS_PAGE_URL = 'https://stayodds.com/insights/';
export const SITE_URL = 'https://stayodds.com';

export interface RangeStat {
  n: number;
  median: number;
  q1: number;
  q3: number;
  min?: number;
  max?: number;
}
export interface HotelRef {
  id: string;
  name: string;
  g: number;
  rc: number;
}

export interface SiteInsights {
  disappoint: { id: string; name: string; guest: number; reviews: number; rank: number; of: number; group: string; awards: string[] }[];
  brands: (RangeStat & { brand: string; best: string; worst: string; logo?: string })[];
  tiers: Record<string, RangeStat>;
  scatter: { id: string; n: string; c: number; g: number }[];
  price: (RangeStat & { band: string; top: HotelRef[] })[];
  areas: (RangeStat & { area: string; best: string })[];
  favourites: (HotelRef & { where: string })[];
  ours: (HotelRef & { ours: number; gap: number })[];
  rivals: { km: number; where: string; hi: HotelRef; lo: HotelRef; gap: number }[];
  dining: { starred: RangeStat; keyedNoStar: RangeStat; all: RangeStat } | null;
  water: { brand: string; n: number; free: number; pct: number }[];
  waterCharged: { id: string; name: string; status: string; summary: string }[];
  telOver: (HotelRef & { t: number; gap: number })[];
  telUnder: (HotelRef & { t: number; gap: number })[];
  telN: number;
  value: (HotelRef & { gbp: number; where: string; dates: string[] })[];
  valueChecked: string;
  /** "updated 26 November 2026" line from the page */
  updated?: string;
  nHotels?: string;
}

const STORE_KEY = 'stayodds_site_insights_v1';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
let cache: SiteInsights | null = null;
let inFlight: Promise<SiteInsights | null> | null = null;

export function parseInsightsPage(html: string): SiteInsights | null {
  const m = html.match(/const D\s*=\s*(\{[\s\S]*?\});\s*\n/);
  if (!m) return null;
  try {
    const d = JSON.parse(m[1]) as SiteInsights;
    const up = html.match(/StayOdds insights\s*·\s*updated\s*([^<]+)</);
    if (up) d.updated = up[1].trim();
    const nh = html.match(/What\s+([\d,]+)\s+luxury hotels look like/);
    if (nh) d.nHotels = nh[1];
    return d;
  } catch {
    return null;
  }
}

function fetchFresh(): Promise<SiteInsights | null> {
  if (!inFlight) {
    inFlight = fetch(`${INSIGHTS_PAGE_URL}?v=${Date.now()}`, { headers: { Accept: 'text/html' } })
      .then((r) => (r.ok ? r.text() : ''))
      .then((html) => {
        const d = html ? parseInsightsPage(html) : null;
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

export async function loadSiteInsights(options?: { force?: boolean }): Promise<SiteInsights | null> {
  if (options?.force) return fetchFresh();
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { savedAt: number; data: SiteInsights };
      cache = saved.data;
      if (Date.now() - saved.savedAt > MAX_AGE_MS) fetchFresh();
      return cache;
    }
  } catch {
    // no saved copy
  }
  return fetchFresh();
}

/** Order the website uses for the awards chart. */
export const TIER_ORDER = ['3 MICHELIN Keys', '2 MICHELIN Keys', '1 MICHELIN Key', 'Forbes Five-Star', "World's 50 Best Top 100", 'No major award'];
