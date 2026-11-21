import { Colors } from './theme';
import type { EditorialRating, Hotel, LinkedYoutubeReview, OfficialAward } from './types';

export interface VerifiedGuestResolved {
  sourceName: string;
  rating: number;
  scale: number;
  reviewCount: number | null;
  normalized100: number;
  verifiedAt: string | null;
  attribution: string;
}

export interface StayOddsResult {
  tier: 'first_hand_verified' | 'short_preview' | 'global_directory';
  tierLabel: string;
  firstHand: boolean;
  visited: boolean;
  ours100: number | null;
  critic100: number | null;
  guest100: number | null;
  overallIndex: number | null;
  greatStayOdds: number | null;
  spread100: number | null;
  sourceCount: number;
  isConsensusBadge: boolean;
  statusBadge: string;
  statusTone: 'accent' | 'teal' | 'amber' | 'slate';
  weights: {
    firstHand: number;
    critics: number;
    guests: number;
  };
  formulaSummary: string;
  editorialRatings: EditorialRating[];
  youtubeReviews: LinkedYoutubeReview[];
  officialAwards: OfficialAward[];
  verifiedGuest: VerifiedGuestResolved | null;
}

export function isValidHttpUrl(url?: string | null): boolean {
  return typeof url === 'string' && /^https?:\/\/[^\s]+$/i.test(url.trim());
}

export function isFirstHandVerified(hotel?: Hotel | null): boolean {
  return Boolean(
    hotel &&
      hotel.visitedByUs !== false &&
      hotel.coverageType !== 'Global Directory' &&
      hotel.overall != null &&
      !Number.isNaN(Number(hotel.overall)) &&
      hotel.scores != null
  );
}

export function isVisitedProperty(hotel?: Hotel | null): boolean {
  return Boolean(hotel && hotel.visitedByUs !== false && hotel.coverageType !== 'Global Directory');
}

/**
 * STRICT CODE-LEVEL ENFORCEMENT:
 * No editorial rating may render or enter the StayOdds formula without a valid HTTP(S) sourceUrl.
 */
export function getVerifiedEditorialRatings(hotel: Hotel): EditorialRating[] {
  const list = Array.isArray(hotel.editorialRatings) ? hotel.editorialRatings : [];
  return list.filter(
    (entry) =>
      entry &&
      isValidHttpUrl(entry.sourceUrl) &&
      typeof entry.sourceName === 'string' &&
      entry.sourceName.trim().length > 0 &&
      entry.normalized100 != null &&
      !Number.isNaN(Number(entry.normalized100))
  );
}

/**
 * STRICT CODE-LEVEL ENFORCEMENT:
 * No third-party YouTube review may render without a valid HTTP(S) sourceUrl.
 */
export function getVerifiedYoutubeReviews(hotel: Hotel): LinkedYoutubeReview[] {
  const list = Array.isArray(hotel.youtubeReviews) ? hotel.youtubeReviews : [];
  return list.filter(
    (entry) =>
      entry &&
      isValidHttpUrl(entry.sourceUrl) &&
      typeof entry.creatorName === 'string' &&
      entry.creatorName.trim().length > 0
  );
}

/**
 * STRICT CODE-LEVEL ENFORCEMENT:
 * No official award may render without a valid HTTP(S) sourceUrl.
 */
export function getVerifiedAwards(hotel: Hotel): OfficialAward[] {
  const list = Array.isArray(hotel.officialAwards) ? hotel.officialAwards : [];
  return list.filter(
    (entry) =>
      entry &&
      isValidHttpUrl(entry.sourceUrl) &&
      typeof entry.label === 'string' &&
      entry.label.trim().length > 0
  );
}

export function getVerifiedGuestScore(hotel: Hotel): VerifiedGuestResolved | null {
  const vg = hotel.verifiedGuest;
  if (!vg) return null;

  if (vg.google && typeof vg.google.rating === 'number' && vg.google.rating > 0) {
    return {
      sourceName: 'Google Reviews',
      rating: vg.google.rating,
      scale: 5,
      reviewCount: typeof vg.google.reviewCount === 'number' ? vg.google.reviewCount : null,
      normalized100: Math.round(vg.google.rating * 20),
      verifiedAt: vg.google.verifiedAt || null,
      attribution: 'Powered by Google',
    };
  }

  if (vg.licensed && typeof vg.licensed.normalized100 === 'number' && vg.licensed.normalized100 > 0) {
    return {
      sourceName: vg.licensed.sourceName || 'Verified Guest Feed',
      rating: vg.licensed.rating ?? Number((vg.licensed.normalized100 / 10).toFixed(1)),
      scale: vg.licensed.scale || 10,
      reviewCount: typeof vg.licensed.reviewCount === 'number' ? vg.licensed.reviewCount : null,
      normalized100: Math.round(vg.licensed.normalized100),
      verifiedAt: vg.licensed.verifiedAt || null,
      attribution: vg.licensed.attribution || vg.licensed.sourceName || 'Licensed Feed',
    };
  }

  return null;
}

export function computeStayOdds(hotel: Hotel): StayOddsResult {
  const firstHand = isFirstHandVerified(hotel);
  const visited = isVisitedProperty(hotel);
  const editorialRatings = getVerifiedEditorialRatings(hotel);
  const youtubeReviews = getVerifiedYoutubeReviews(hotel);
  const officialAwards = getVerifiedAwards(hotel);
  const verifiedGuest = getVerifiedGuestScore(hotel);

  const ours100 = firstHand && hotel.overall != null ? Math.round(Number(hotel.overall) * 20) : null;
  const critic100 =
    editorialRatings.length > 0
      ? Math.round(
          editorialRatings.reduce((acc, item) => acc + Number(item.normalized100), 0) /
            editorialRatings.length
        )
      : null;
  const guest100 = verifiedGuest ? verifiedGuest.normalized100 : null;

  let weights = { firstHand: 0, critics: 0, guests: 0 };
  let overallIndex: number | null = null;
  let greatStayOdds: number | null = null;
  let spread100: number | null = null;
  let statusBadge = 'Live Ratings Pending';
  let statusTone: 'accent' | 'teal' | 'amber' | 'slate' = 'slate';
  let isConsensusBadge = false;
  let formulaSummary = 'Awaiting live verified guest ratings & sourced critic links (Phase 1B).';

  const activeScores = [ours100, critic100, guest100].filter((v): v is number => v != null);
  const sourceCount = activeScores.length;

  if (firstHand && ours100 != null) {
    if (critic100 != null && guest100 != null) {
      weights = { firstHand: 40, critics: 30, guests: 30 };
      overallIndex = Math.round(ours100 * 0.4 + critic100 * 0.3 + guest100 * 0.3);
      formulaSummary = '40% First-Hand Stay • 30% Sourced Critics • 30% Live Verified Guests';
    } else if (guest100 != null) {
      weights = { firstHand: 55, critics: 0, guests: 45 };
      overallIndex = Math.round(ours100 * 0.55 + guest100 * 0.45);
      formulaSummary = '55% First-Hand Stay • 45% Live Verified Guests (auto-reweighted)';
    } else if (critic100 != null) {
      weights = { firstHand: 55, critics: 45, guests: 0 };
      overallIndex = Math.round(ours100 * 0.55 + critic100 * 0.45);
      formulaSummary = '55% First-Hand Stay • 45% Sourced Critics (auto-reweighted)';
    } else {
      weights = { firstHand: 100, critics: 0, guests: 0 };
      overallIndex = ours100;
      greatStayOdds = ours100;
      statusBadge = 'First-Hand Only';
      statusTone = 'accent';
      formulaSummary = '100% First-Hand Verified Stay — live guest API connects in Phase 1B.';
    }
  } else {
    if (critic100 != null && guest100 != null) {
      if (editorialRatings.length >= 2) {
        weights = { firstHand: 0, critics: 40, guests: 60 };
        overallIndex = Math.round(critic100 * 0.4 + guest100 * 0.6);
        formulaSummary = '40% Sourced Critics (2+ outlets) • 60% Live Verified Guests';
      } else {
        weights = { firstHand: 0, critics: 25, guests: 75 };
        overallIndex = Math.round(critic100 * 0.25 + guest100 * 0.75);
        formulaSummary = '25% Sourced Critic (1 outlet) • 75% Live Verified Guests';
      }
    } else if (guest100 != null) {
      weights = { firstHand: 0, critics: 0, guests: 100 };
      overallIndex = guest100;
      greatStayOdds = guest100;
      statusBadge = 'Guest Data Only';
      statusTone = 'teal';
      formulaSummary = '100% Live Verified Guest Ratings (no sourced critic ratings yet).';
    } else if (critic100 != null) {
      weights = { firstHand: 0, critics: 100, guests: 0 };
      overallIndex = critic100;
      greatStayOdds = critic100;
      statusBadge = 'Editorial Only';
      statusTone = 'slate';
      formulaSummary = '100% Sourced Editorial Ratings (live guest ratings pending).';
    }
  }

  // Consensus status badges ONLY unlock when >= 2 verified numeric layers exist
  if (sourceCount >= 2 && overallIndex != null) {
    isConsensusBadge = true;
    spread100 = Math.max(...activeScores) - Math.min(...activeScores);
    if (spread100 <= 6) {
      statusBadge = 'Strong Consensus';
      statusTone = 'accent';
      greatStayOdds = Math.min(98, overallIndex + 2);
    } else if (spread100 <= 12) {
      statusBadge = 'Mostly Aligned';
      statusTone = 'teal';
      greatStayOdds = overallIndex;
    } else {
      statusBadge = 'Split Verdict';
      statusTone = 'amber';
      greatStayOdds = Math.max(50, overallIndex - 4);
    }
  }

  return {
    tier: firstHand ? 'first_hand_verified' : visited ? 'short_preview' : 'global_directory',
    tierLabel: firstHand
      ? 'First-Hand Verified'
      : visited
      ? 'Short Tour Preview'
      : 'Global Directory',
    firstHand,
    visited,
    ours100,
    critic100,
    guest100,
    overallIndex,
    greatStayOdds,
    spread100,
    sourceCount,
    isConsensusBadge,
    statusBadge,
    statusTone,
    weights,
    formulaSummary,
    editorialRatings,
    youtubeReviews,
    officialAwards,
    verifiedGuest,
  };
}

export function getTonePalette(tone: StayOddsResult['statusTone']) {
  if (tone === 'amber') {
    return {
      color: Colors.amber,
      ring: Colors.amberRing,
      soft: Colors.amberSoft,
      border: Colors.amberBorder,
    };
  }
  if (tone === 'teal') {
    return {
      color: Colors.teal,
      ring: Colors.teal,
      soft: Colors.tealSoft,
      border: Colors.tealBorder,
    };
  }
  if (tone === 'accent') {
    return {
      color: Colors.accent,
      ring: Colors.accent,
      soft: Colors.accentSoft,
      border: Colors.accentBorder,
    };
  }
  return {
    color: Colors.slate,
    ring: '#475569',
    soft: Colors.slateSoft,
    border: Colors.slateBorder,
  };
}
