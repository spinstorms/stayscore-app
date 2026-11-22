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
  googleMapsUri?: string | null;
}

export interface OpinionGapModel {
  mode: 'my_vs_guests' | 'critics_vs_guests';
  title: string;
  leftLabel: string;
  left100: number | null;
  leftDisplay: string;
  rightLabel: string;
  right100: number | null;
  rightDisplay: string;
  delta100: number | null;
  deltaLabel: string;
  headline: string;
  narrative: string;
}

export interface KeyFactTile {
  label: string;
  value: string;
}

export interface StayOddsResult {
  tier: 'first_hand_verified' | 'short_preview' | 'global_directory';
  tierLabel: string;
  firstHand: boolean;
  visited: boolean;
  personalScore25: number | null;
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
  opinionGap: OpinionGapModel;
  keyFacts: KeyFactTile[];
  redFlags: string[];
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

export function getVerifiedEditorialRatings(hotel: Hotel): EditorialRating[] {
  const list = Array.isArray(hotel.editorialRatings) ? hotel.editorialRatings : [];
  return list.filter(
    (entry) =>
      entry &&
      isValidHttpUrl(entry.sourceUrl) &&
      typeof entry.sourceName === 'string' &&
      entry.sourceName.trim().length > 0
  );
}

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

export function getKeyFactsList(hotel: Hotel): KeyFactTile[] {
  const f = hotel.keyFacts || {};
  const items: KeyFactTile[] = [];
  if (f.poolHeating) items.push({ label: 'Pool & Heating', value: f.poolHeating });
  if (f.beachOrReef) items.push({ label: 'Beach & Reef', value: f.beachOrReef });
  if (f.renovationYear) items.push({ label: 'Opened / Renovated', value: String(f.renovationYear) });
  if (f.transferLogistics) items.push({ label: 'Transfers', value: f.transferLogistics });
  if (hotel.priceRange) items.push({ label: 'Price Tier', value: hotel.priceRange });
  return items;
}

export function getVerifiedGuestScore(
  hotel: Hotel,
  liveGoogle?: { rating: number; reviewCount?: number | null; googleMapsUri?: string | null; fetchedAt?: string } | null
): VerifiedGuestResolved | null {
  if (liveGoogle && typeof liveGoogle.rating === 'number' && liveGoogle.rating > 0) {
    return {
      sourceName: 'Google Reviews',
      rating: liveGoogle.rating,
      scale: 5,
      reviewCount: typeof liveGoogle.reviewCount === 'number' ? liveGoogle.reviewCount : null,
      normalized100: Math.round(liveGoogle.rating * 20),
      verifiedAt: liveGoogle.fetchedAt || null,
      attribution: 'Powered by Google',
      googleMapsUri: liveGoogle.googleMapsUri || null,
    };
  }

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
      googleMapsUri: vg.google.googleMapsUri || null,
    };
  }

  if (vg.licensed && typeof vg.licensed.normalized100 === 'number' && vg.licensed.normalized100 > 0) {
    return {
      sourceName: vg.licensed.sourceName || 'Verified Guests',
      rating: vg.licensed.rating ?? Number((vg.licensed.normalized100 / 10).toFixed(1)),
      scale: vg.licensed.scale || 10,
      reviewCount: typeof vg.licensed.reviewCount === 'number' ? vg.licensed.reviewCount : null,
      normalized100: Math.round(vg.licensed.normalized100),
      verifiedAt: vg.licensed.verifiedAt || null,
      attribution: vg.licensed.attribution || 'Verified Guest Score',
    };
  }

  return null;
}

export function computeStayOdds(
  hotel: Hotel,
  liveGoogle?: { rating: number; reviewCount?: number | null; googleMapsUri?: string | null; fetchedAt?: string } | null
): StayOddsResult {
  const firstHand = isFirstHandVerified(hotel);
  const visited = isVisitedProperty(hotel);
  const editorialRatings = getVerifiedEditorialRatings(hotel);
  const youtubeReviews = getVerifiedYoutubeReviews(hotel);
  const officialAwards = getVerifiedAwards(hotel);
  const verifiedGuest = getVerifiedGuestScore(hotel, liveGoogle);
  const keyFacts = getKeyFactsList(hotel);
  const redFlags = Array.isArray(hotel.redFlags) ? hotel.redFlags.filter(Boolean) : [];

  const s = hotel.scores;
  const personalScore25 =
    firstHand && s
      ? Number(s.value) + Number(s.rooms) + Number(s.grounds) + Number(s.food) + Number(s.service)
      : null;
  const ours100 =
    personalScore25 != null && !Number.isNaN(personalScore25)
      ? Math.round(personalScore25 * 4)
      : firstHand && hotel.overall != null
      ? Math.round(Number(hotel.overall) * 20)
      : null;

  const scoredEditorial = editorialRatings.filter(
    (r) => r.normalized100 != null && !Number.isNaN(Number(r.normalized100))
  );
  const scoredCritics = scoredEditorial.map((r) => Number(r.normalized100));
  const critic100 =
    scoredCritics.length > 0
      ? Math.round(scoredCritics.reduce((acc, v) => acc + v, 0) / scoredCritics.length)
      : null;
  const primaryCritic = scoredEditorial.length > 0 ? scoredEditorial[0] : null;

  const guest100 = verifiedGuest ? verifiedGuest.normalized100 : null;

  let weights = { firstHand: 0, critics: 0, guests: 0 };
  let overallIndex: number | null = null;
  let greatStayOdds: number | null = null;
  let spread100: number | null = null;
  let statusBadge = officialAwards.length > 0 ? 'Award-Winning' : 'Global Directory';
  let statusTone: 'accent' | 'teal' | 'amber' | 'slate' = officialAwards.length > 0 ? 'teal' : 'slate';
  let isConsensusBadge = false;
  let formulaSummary =
    officialAwards.length > 0
      ? `Awarded ${officialAwards.map((a) => a.label).join(' • ')} — open breakdown for live Google reviews.`
      : 'Open breakdown for live Google reviews & verified specs.';

  const activeScores = [ours100, critic100, guest100].filter((v): v is number => v != null);
  const sourceCount = activeScores.length;

  if (firstHand && ours100 != null) {
    if (critic100 != null && guest100 != null) {
      weights = { firstHand: 40, critics: 30, guests: 30 };
      overallIndex = Math.round(ours100 * 0.4 + critic100 * 0.3 + guest100 * 0.3);
      formulaSummary = '40% My Stay • 30% Published Critics • 30% Verified Guests';
    } else if (guest100 != null) {
      weights = { firstHand: 55, critics: 0, guests: 45 };
      overallIndex = Math.round(ours100 * 0.55 + guest100 * 0.45);
      formulaSummary = '55% My Stay • 45% Verified Guests';
    } else if (critic100 != null) {
      weights = { firstHand: 55, critics: 45, guests: 0 };
      overallIndex = Math.round(ours100 * 0.55 + critic100 * 0.45);
      formulaSummary = '55% My Stay • 45% Published Critics';
    } else {
      weights = { firstHand: 100, critics: 0, guests: 0 };
      overallIndex = ours100;
      greatStayOdds = ours100;
      statusBadge = 'First-Hand Verified';
      statusTone = 'accent';
      formulaSummary = '100% My First-Hand Stay — open breakdown for live Google reviews.';
    }
  } else {
    if (critic100 != null && guest100 != null) {
      weights = { firstHand: 0, critics: 35, guests: 65 };
      overallIndex = Math.round(critic100 * 0.35 + guest100 * 0.65);
      formulaSummary = '35% Published Critics • 65% Verified Guests';
    } else if (guest100 != null) {
      weights = { firstHand: 0, critics: 0, guests: 100 };
      overallIndex = guest100;
      greatStayOdds = guest100;
      statusBadge = 'Verified Guest Score';
      statusTone = 'teal';
      formulaSummary = '100% Verified Guest Ratings';
    } else if (critic100 != null) {
      weights = { firstHand: 0, critics: 100, guests: 0 };
      overallIndex = critic100;
      greatStayOdds = critic100;
      statusBadge = 'Critic Reviewed';
      statusTone = 'slate';
      formulaSummary = '100% Published Critic Reviews — open detail for live Google reviews.';
    }
  }

  if (sourceCount >= 2 && overallIndex != null) {
    isConsensusBadge = true;
    spread100 = Math.max(...activeScores) - Math.min(...activeScores);
    if (spread100 <= 6) {
      statusBadge = 'Strong Agreement';
      statusTone = 'accent';
      greatStayOdds = Math.min(98, overallIndex + 2);
    } else if (spread100 <= 12) {
      statusBadge = 'Mostly Aligned';
      statusTone = 'teal';
      greatStayOdds = overallIndex;
    } else {
      statusBadge = 'Opinions Differ';
      statusTone = 'amber';
      greatStayOdds = Math.max(50, overallIndex - 4);
    }
  }

  const left100 = firstHand ? ours100 : critic100;
  const right100 = guest100;
  const delta100 = left100 != null && right100 != null ? left100 - right100 : null;

  let headline = firstHand
    ? 'My first-hand stay notes below — compare directly with real guest reviews'
    : officialAwards.length > 0
    ? `Recognised with ${officialAwards.map((a) => a.label).join(' • ')}`
    : 'Published critics & verified guest reviews compared side-by-side';
  if (delta100 != null) {
    const criticName =
      scoredEditorial.length === 1 && primaryCritic
        ? primaryCritic.sourceName
        : `${scoredEditorial.length} published critics`;
    if (Math.abs(delta100) <= 5) {
      headline = firstHand
        ? `Tight agreement (${delta100 >= 0 ? `+${delta100}` : delta100} pts) — my stay matched real guests`
        : `Tight agreement (${delta100 >= 0 ? `+${delta100}` : delta100} pts) — ${criticName} & real guests agree`;
    } else if (delta100 > 5) {
      headline = firstHand
        ? `I rated this +${delta100} pts higher than real guests`
        : `${criticName} rated this +${delta100} pts higher than real guests`;
    } else {
      headline = firstHand
        ? `I rated this ${delta100} pts stricter than real guests — see what held it back`
        : `Real guests rated this +${Math.abs(delta100)} pts higher than ${criticName}`;
    }
  }

  const opinionGap: OpinionGapModel = {
    mode: firstHand ? 'my_vs_guests' : 'critics_vs_guests',
    title: firstHand ? 'My Score vs. Real Guest Score' : 'Published Critics vs. Real Guest Score',
    leftLabel: firstHand
      ? 'My First-Hand Stay'
      : scoredEditorial.length === 1 && primaryCritic
      ? primaryCritic.sourceName
      : 'Published Critics',
    left100,
    leftDisplay: firstHand
      ? personalScore25 != null
        ? `${personalScore25} / 25`
        : `${hotel.overall} / 5`
      : scoredEditorial.length === 1 && primaryCritic
      ? primaryCritic.rawScore || `${critic100} / 100`
      : critic100 != null
      ? `${critic100} / 100`
      : 'No critic score',
    rightLabel: verifiedGuest ? verifiedGuest.sourceName : 'Real Guest Score',
    right100,
    rightDisplay: verifiedGuest
      ? `${verifiedGuest.rating.toFixed(1)} / ${verifiedGuest.scale}`
      : 'Live Google',
    delta100,
    deltaLabel: delta100 != null ? `${delta100 > 0 ? '+' : ''}${delta100} pts` : 'Live',
    headline,
    narrative: firstHand ? hotel.whereWeDiffer || hotel.verdict || '' : hotel.standout || '',
  };

  return {
    tier: firstHand ? 'first_hand_verified' : visited ? 'short_preview' : 'global_directory',
    tierLabel: firstHand
      ? 'First-Hand Verified'
      : visited
      ? 'Short Tour Preview'
      : 'Global Directory',
    firstHand,
    visited,
    personalScore25,
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
    opinionGap,
    keyFacts,
    redFlags,
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

export function getTripAdvisorUrl(hotel: Pick<Hotel, 'name' | 'location' | 'country'>): string {
  const query = `${hotel.name || ''} ${hotel.location || hotel.country || ''}`.trim();
  return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(query)}&ssrc=h`;
}

