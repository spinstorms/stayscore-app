import { getGuestProfile, getPartnerPrograms } from './insights';
import type { Hotel } from './types';

/** Explore's award / data filters, shared with the trip finder. */
export type VerifiedFeature =
  | 'all'
  | '50best_50'
  | '50best_100'
  | 'michelin'
  | 'michelin_3'
  | 'michelin_2'
  | 'michelin_1'
  | 'forbes'
  | 'video'
  | 'adults'
  | 'family'
  | 'preferred'
  | 'points'
  | 'beach';

export function getW50BestRank(h: Hotel): number | null {
  let best: number | null = null;
  for (const a of h.officialAwards || []) {
    const txt = `${a.awardBody || ''} ${a.label || ''}`;
    if (/50\s*best/i.test(txt)) {
      const m = String(a.label || '').match(/(?:No\.?|#)\s*(\d{1,3})/i);
      const val = m ? Number(m[1]) : 999;
      if (best == null || val < best) best = val;
    }
  }
  return best;
}

export function getMichelinKeyCount(h: Hotel): number | null {
  let best: number | null = null;
  for (const a of h.officialAwards || []) {
    const txt = `${a.awardBody || ''} ${a.label || ''}`;
    if (/michelin/i.test(txt)) {
      const m = String(a.label || '').match(/([123])\s*michelin\s*key/i);
      const val = m ? Number(m[1]) : 1;
      if (best == null || val > best) best = val;
    }
  }
  return best;
}

export function getForbesRank(h: Hotel): number | null {
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

export const FEATURE_FILTERS: { id: VerifiedFeature; label: string; match: (h: Hotel) => boolean }[] = [
  { id: 'all', label: 'All Data', match: () => true },
  {
    id: '50best_50',
    label: '🏆 Top 50 (#1→50)',
    match: (h) => {
      const r = getW50BestRank(h);
      return r != null && r >= 1 && r <= 50;
    },
  },
  {
    id: '50best_100',
    label: '💯 Top 100 (#1→100)',
    match: (h) => {
      const r = getW50BestRank(h);
      return r != null && r >= 1 && r <= 100;
    },
  },
  {
    id: 'michelin',
    label: '🗝️ MICHELIN (3→1)',
    match: (h) => getMichelinKeyCount(h) != null,
  },
  {
    id: 'michelin_3',
    label: '🗝️ 3 Keys',
    match: (h) => getMichelinKeyCount(h) === 3,
  },
  {
    id: 'michelin_2',
    label: '🗝️ 2 Keys',
    match: (h) => getMichelinKeyCount(h) === 2,
  },
  {
    id: 'michelin_1',
    label: '🗝️ 1 Key',
    match: (h) => getMichelinKeyCount(h) === 1,
  },
  {
    id: 'forbes',
    label: '⭐ Forbes',
    match: (h) => getForbesRank(h) != null,
  },
  {
    id: 'video',
    label: 'Video Reviews',
    match: (h) => Boolean(h.videoId || (h.youtubeReviews && h.youtubeReviews.length > 0)),
  },
  {
    id: 'adults',
    label: '🥂 Adults-Only',
    match: (h) => getGuestProfile(h).adultsOnly,
  },
  {
    id: 'family',
    label: '👨‍👩‍👧 Family & Kids',
    match: (h) => getGuestProfile(h).familyFriendly,
  },
  {
    id: 'preferred',
    label: '✨ Preferred Perks',
    match: (h) => getPartnerPrograms(h).hasPreferredPerks,
  },
  {
    id: 'points',
    label: '★ Points Brands',
    match: (h) => getPartnerPrograms(h).isPointsEligible,
  },
  {
    id: 'beach',
    label: 'Beach / Reef',
    match: (h) => Boolean(h.keyFacts?.beachOrReef || h.region === 'Maldives'),
  },
];
