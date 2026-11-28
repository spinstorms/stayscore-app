import type { Hotel } from './types';

export type AwardListId = 'w50' | 'michelin3' | 'michelin2' | 'michelin1';

export function michelinKeys(h: Hotel): number | null {
  for (const a of h.officialAwards || []) {
    if (/michelin/i.test(`${a.awardBody || ''} ${a.label || ''}`)) {
      const m = String(a.label || '').match(/([123])\s*michelin\s*key/i);
      if (m) return Number(m[1]);
    }
  }
  return null;
}

export function w50Rank(h: Hotel): number | null {
  for (const a of h.officialAwards || []) {
    if (/50\s*best/i.test(a.awardBody || '')) {
      const m = String(a.label || '').match(/No\.\s*(\d+)\s+in the World/i);
      if (m) return Number(m[1]);
    }
  }
  return null;
}

export function guestScore(h: Hotel): number | null {
  const g = h.verifiedGuest?.licensed?.normalized100;
  return typeof g === 'number' ? g : null;
}

export function matchesAwardList(h: Hotel, id: AwardListId): boolean {
  if (id === 'w50') return w50Rank(h) != null;
  return michelinKeys(h) === Number(id.slice(-1));
}

/** Hotels on a list, in order: official rank for the World's 50 Best, verified guest score for MICHELIN Keys. */
export function awardList(hotels: Hotel[], id: AwardListId): Hotel[] {
  const rows = hotels.filter((h) => matchesAwardList(h, id));
  if (id === 'w50') return rows.sort((a, b) => (w50Rank(a) ?? 999) - (w50Rank(b) ?? 999));
  return rows.sort((a, b) => (guestScore(b) ?? -1) - (guestScore(a) ?? -1) || a.name.localeCompare(b.name));
}

export const AWARD_LISTS: {
  id: AwardListId;
  short: string;
  title: string;
  officialTotal: number;
  note: (n: number) => string;
  sourceUrl: string;
}[] = [
  {
    id: 'w50',
    short: 'Top 100',
    title: "The World's 50 Best Hotels 2026",
    officialTotal: 100,
    note: (n) => `${n} of 100 ranked hotels, in official order.`,
    sourceUrl: 'https://www.the50.com/hotels/best-in-the-world/',
  },
  {
    id: 'michelin3',
    short: '3 Keys',
    title: '2026 MICHELIN Guide: 3 Keys',
    officialTotal: 155,
    note: (n) => `${n} of 155 three-Key hotels, ordered by verified guest score.`,
    sourceUrl: 'https://guide.michelin.com/en/article/travel/all-the-key-hotels-in-the-world-michelin-guide',
  },
  {
    id: 'michelin2',
    short: '2 Keys',
    title: '2026 MICHELIN Guide: 2 Keys',
    officialTotal: 657,
    note: (n) => `${n} of 657 two-Key hotels so far, ordered by verified guest score.`,
    sourceUrl: 'https://guide.michelin.com/en/article/travel/all-the-key-hotels-in-the-world-michelin-guide',
  },
  {
    id: 'michelin1',
    short: '1 Key',
    title: '2026 MICHELIN Guide: 1 Key',
    officialTotal: 2020,
    note: (n) => `${n} one-Key hotels in StayOdds (the full selection has 2,020).`,
    sourceUrl: 'https://guide.michelin.com/en/article/travel/all-the-key-hotels-in-the-world-michelin-guide',
  },
];

export const MICHELIN_EXPLAINER = {
  title: 'What is a MICHELIN Key?',
  body:
    "The Key is the MICHELIN Guide's distinction for hotels, its equivalent of the Star for restaurants. Keys are awarded by MICHELIN inspectors after anonymous stays or visits, and recognise a unique hospitality concept, distinctive character, a warm welcome and a very high level of service.",
  levels: ['One Key: "a very special stay"', 'Two Keys: "an exceptional stay"', 'Three Keys: "an extraordinary stay"'],
  footer: 'The 2026 selection has 155 Three-Key, 657 Two-Key and 2,020 One-Key hotels worldwide.',
  sourceUrl: 'https://guide.michelin.com/us/en/article/travel/one-two-three-michelin-keys-hotels-have-own-distinction-michelin-guide',
};

export const W50_EXPLAINER = {
  title: "How the World's 50 Best Hotels is ranked",
  body:
    "The list is voted by The World's 50 Best Hotels Academy: travel experts in 13 regions, each panel split equally between travel journalists, hoteliers and seasoned luxury travellers, with a 50/50 gender balance. Each member votes for seven hotels in order of preference, must have stayed at every hotel they vote for in the last three years and upload proof of the stay, and cannot vote for hotels they own or have a financial interest in. Voting is confidential and independently adjudicated by Deloitte. Ranks 51–100 are published as the extended list.",
  sourceUrl: 'https://www.the50.com/hotels/best-in-the-world/how-the-voting-works.html',
};

/** Forbes Travel Guide level: 5 = Five-Star, 4 = Four-Star, 3 = Recommended (as on the website). */
export function forbesRank(h: Hotel): number | null {
  let best: number | null = null;
  for (const a of h.officialAwards || []) {
    const txt = `${a.awardBody || ''} ${a.label || ''}`;
    if (/forbes/i.test(txt)) {
      let val = 1;
      if (/five[- ]star/i.test(txt)) val = 5;
      else if (/four[- ]star/i.test(txt)) val = 4;
      else if (/recommended/i.test(txt)) val = 3;
      if (best == null || val > best) best = val;
    }
  }
  return best;
}

export type AwardFilterId = 'keys' | 'stars' | 'w50' | 'forbes5';
export type DiningMap = Record<string, { distinction: string }[] | undefined>;

export function hasStarRestaurant(h: Hotel, dining: DiningMap): boolean {
  return (dining[h.id] || []).some((r) => /MICHELIN Star/.test(r.distinction || ''));
}

/** The world map's multi-select award filters, same ids and wording as stayodds.com/hotels/. */
export const AWARD_FILTERS: { id: AwardFilterId; label: string; test: (h: Hotel, dining: DiningMap) => boolean }[] = [
  { id: 'keys', label: 'MICHELIN Keys', test: (h) => michelinKeys(h) != null },
  { id: 'stars', label: 'MICHELIN-starred restaurant', test: (h, d) => hasStarRestaurant(h, d) },
  { id: 'w50', label: "World's 50 Best", test: (h) => w50Rank(h) != null },
  { id: 'forbes5', label: 'Forbes Five-Star', test: (h) => forbesRank(h) === 5 },
];

export function applyAwardFilters(
  list: Hotel[],
  selected: AwardFilterId[],
  match: 'all' | 'any',
  dining: DiningMap
): Hotel[] {
  const sel = AWARD_FILTERS.filter((f) => selected.includes(f.id));
  if (!sel.length) return list;
  return match === 'any'
    ? list.filter((h) => sel.some((f) => f.test(h, dining)))
    : list.filter((h) => sel.every((f) => f.test(h, dining)));
}
