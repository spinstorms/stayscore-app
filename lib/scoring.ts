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
  scoreTrack: 'verified' | 'market';
  scoreTrackLabel: string;
  firstHand: boolean;
  visited: boolean;
  personalScore25: number | null;
  personalScoreMax: number;
  personalScoreLabel: string | null;
  ours100: number | null;
  critic100: number | null;
  guest100: number | null;
  marketOdds: number | null;
  marketSourceCount: number;
  founderVsMarketDelta: number | null;
  founderVsMarketLabel: string | null;
  overallIndex: number | null;
  greatStayOdds: number | null;
  spread100: number | null;
  sourceCount: number;
  isConsensusBadge: boolean;
  statusBadge: string;
  statusTone: 'accent' | 'teal' | 'amber' | 'slate';
  weights: {
    firstHand: number;
    market: number;
    critics: number;
    guests: number;
  };
  formulaSummary: string;
  equationSummary: string;
  opinionGap: OpinionGapModel;
  keyFacts: KeyFactTile[];
  redFlags: string[];
  editorialRatings: EditorialRating[];
  unverifiedEditorial?: EditorialRating[];
  youtubeReviews: LinkedYoutubeReview[];
  officialAwards: OfficialAward[];
  verifiedGuest: VerifiedGuestResolved | null;
}

export function dampenThinGuestScore(raw100: number, reviewCount?: number | null): number {
  const n = Number(reviewCount);
  if (!Number.isFinite(n) || n <= 0 || n >= 40) return Math.round(raw100);
  return Math.round((raw100 * n + 90 * 15) / (n + 15));
}

export function isScoreUnverified(entry?: { rawScore?: string | null; takeaway?: string | null; sentiment?: string | null } | null): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const text = `${entry.rawScore || ''} ${entry.takeaway || ''} ${entry.sentiment || ''}`;
  return /unable to verify|unverified/i.test(text);
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
    const rc = typeof liveGoogle.reviewCount === 'number' ? liveGoogle.reviewCount : null;
    return {
      sourceName: 'Google Reviews',
      rating: liveGoogle.rating,
      scale: 5,
      reviewCount: rc,
      normalized100: dampenThinGuestScore(Math.round(liveGoogle.rating * 20), rc),
      verifiedAt: liveGoogle.fetchedAt || null,
      attribution: 'Powered by Google',
      googleMapsUri: liveGoogle.googleMapsUri || null,
    };
  }

  const vg = hotel.verifiedGuest;
  if (!vg) return null;

  if (vg.google && typeof vg.google.rating === 'number' && vg.google.rating > 0) {
    const rc = typeof vg.google.reviewCount === 'number' ? vg.google.reviewCount : null;
    return {
      sourceName: 'Google Reviews',
      rating: vg.google.rating,
      scale: 5,
      reviewCount: rc,
      normalized100: dampenThinGuestScore(Math.round(vg.google.rating * 20), rc),
      verifiedAt: vg.google.verifiedAt || null,
      attribution: 'Powered by Google',
      googleMapsUri: vg.google.googleMapsUri || null,
    };
  }

  if (vg.licensed && typeof vg.licensed.normalized100 === 'number' && vg.licensed.normalized100 > 0) {
    const rc = typeof vg.licensed.reviewCount === 'number' ? vg.licensed.reviewCount : null;
    return {
      sourceName: vg.licensed.sourceName || 'Verified Guests',
      rating: vg.licensed.rating ?? Number((vg.licensed.normalized100 / 10).toFixed(1)),
      scale: vg.licensed.scale || 10,
      reviewCount: rc,
      normalized100: dampenThinGuestScore(Math.round(vg.licensed.normalized100), rc),
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
  const nonNullVals =
    firstHand && s
      ? [s.value, s.rooms, s.grounds, s.food, s.service]
          .filter((v): v is number => v != null && !Number.isNaN(Number(v)))
          .map(Number)
      : [];
  const personalScore25 =
    nonNullVals.length > 0
      ? Number(nonNullVals.reduce((a, b) => a + b, 0).toFixed(2))
      : null;
  const personalScoreMax = nonNullVals.length > 0 ? nonNullVals.length * 5 : 25;
  const personalScoreLabel =
    personalScore25 != null
      ? `${Number.isInteger(personalScore25) ? personalScore25 : Number(personalScore25.toFixed(2))} / ${personalScoreMax}`
      : null;
  const ours100 =
    personalScore25 != null
      ? Math.round((personalScore25 / personalScoreMax) * 100)
      : firstHand && hotel.overall != null
      ? Math.round(Number(hotel.overall) * 20)
      : null;

  const scoredEditorial = editorialRatings.filter(
    (r) => r.normalized100 != null && !Number.isNaN(Number(r.normalized100)) && !isScoreUnverified(r)
  );
  const unverifiedEditorial = editorialRatings.filter((r) => isScoreUnverified(r));
  const scoredCritics = scoredEditorial.map((r) => Number(r.normalized100));
  const critic100 =
    scoredCritics.length > 0
      ? Math.round(scoredCritics.reduce((acc, v) => acc + v, 0) / scoredCritics.length)
      : null;
  const primaryCritic = scoredEditorial.length > 0 ? scoredEditorial[0] : null;

  const guest100 = verifiedGuest ? verifiedGuest.normalized100 : null;

  // LAYER 1: Universal External Baseline ("Market Odds")
  let marketOdds: number | null = null;
  let marketSourceCount = 0;
  if (critic100 != null && guest100 != null) {
    marketOdds = Math.round(critic100 * 0.35 + guest100 * 0.65);
    marketSourceCount = 2;
  } else if (guest100 != null) {
    marketOdds = guest100;
    marketSourceCount = 1;
  } else if (critic100 != null) {
    marketOdds = critic100;
    marketSourceCount = 1;
  }

  // LAYER 2: Two-Track Score ("Verified StayOdds" vs "Market Odds")
  const scoreTrack: 'verified' | 'market' = firstHand && ours100 != null ? 'verified' : 'market';
  const scoreTrackLabel = scoreTrack === 'verified' ? 'Verified StayOdds' : 'Market Odds';
  const founderVsMarketDelta =
    firstHand && ours100 != null && marketOdds != null ? ours100 - marketOdds : null;
  const founderVsMarketLabel =
    founderVsMarketDelta != null
      ? `${founderVsMarketDelta > 0 ? '+' : ''}${founderVsMarketDelta} pts vs Market`
      : null;

  let weights = { firstHand: 0, market: 0, critics: 0, guests: 0 };
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

  if (scoreTrack === 'verified' && ours100 != null) {
    if (marketOdds != null) {
      overallIndex = Math.round(ours100 * 0.7 + marketOdds * 0.3);
      weights = {
        firstHand: 70,
        market: 30,
        critics: critic100 != null && guest100 != null ? 11 : critic100 != null ? 30 : 0,
        guests: critic100 != null && guest100 != null ? 19 : guest100 != null ? 30 : 0,
      };
      formulaSummary = `70% My Stay • 30% Market Odds (${marketOdds}%)`;
    } else {
      overallIndex = ours100;
      weights = { firstHand: 100, market: 0, critics: 0, guests: 0 };
      statusBadge = 'First-Hand Verified';
      statusTone = 'accent';
      formulaSummary = '100% My First-Hand Stay';
    }
  } else {
    overallIndex = marketOdds;
    if (critic100 != null && guest100 != null) {
      weights = { firstHand: 0, market: 100, critics: 35, guests: 65 };
      formulaSummary = 'Market Odds: 35% Critics • 65% Verified Guests';
    } else if (guest100 != null) {
      weights = { firstHand: 0, market: 100, critics: 0, guests: 100 };
      statusBadge = 'Market Odds (1 Source)';
      statusTone = 'teal';
      formulaSummary = 'Market Odds: 100% Verified Guest Ratings';
    } else if (critic100 != null) {
      weights = { firstHand: 0, market: 100, critics: 100, guests: 0 };
      statusBadge = 'Critic Reviewed';
      statusTone = 'slate';
      formulaSummary = 'Market Odds: 100% Published Critic Reviews';
    }
  }

  greatStayOdds = overallIndex;
  if (sourceCount >= 2 && overallIndex != null) {
    isConsensusBadge = true;
    spread100 =
      scoreTrack === 'verified' && founderVsMarketDelta != null
        ? Math.abs(founderVsMarketDelta)
        : Math.max(...activeScores) - Math.min(...activeScores);
    if (spread100 <= 6) {
      statusBadge = 'Strong Agreement';
      statusTone = 'accent';
    } else if (spread100 <= 12) {
      statusBadge = 'Mostly Aligned';
      statusTone = 'teal';
    } else {
      statusBadge = 'Opinions Differ';
      statusTone = 'amber';
    }
  }

  const equationSummary =
    scoreTrack === 'verified' && ours100 != null && greatStayOdds != null
      ? marketOdds != null
        ? `70% My Stay (${personalScoreLabel ? `${personalScoreLabel.replace(/ /g, '')} → ` : ''}${ours100}%) + 30% Market Odds (${marketOdds}%) = ${greatStayOdds}% Verified StayOdds`
        : `100% My First-Hand Stay (${personalScoreLabel ? `${personalScoreLabel.replace(/ /g, '')} → ` : ''}${ours100}%) = ${greatStayOdds}% Verified StayOdds`
      : marketOdds != null
      ? `${formulaSummary} = ${marketOdds}% Market Odds`
      : 'Waiting for live Google guest rating — Market Odds blends verified external scores.';

  const left100 = firstHand ? ours100 : critic100;
  const right100 = firstHand ? marketOdds : guest100;
  const delta100 = left100 != null && right100 != null ? left100 - right100 : null;

  let headline = firstHand
    ? 'My first-hand stay score leads here — compare directly with Market Odds'
    : unverifiedEditorial.length > 0 && scoredEditorial.length === 0
    ? `${unverifiedEditorial.map((u) => u.sourceName).join(', ')} awards a score (unverified figure — excluded from numeric math)`
    : officialAwards.length > 0
    ? `Recognised with ${officialAwards.map((a) => a.label).join(' • ')}`
    : 'Market Odds baseline from published critics & verified guests';
  if (delta100 != null) {
    const criticName =
      scoredEditorial.length === 1 && primaryCritic
        ? primaryCritic.sourceName
        : `${scoredEditorial.length} published critics`;
    if (Math.abs(delta100) <= 5) {
      headline = firstHand
        ? `Tight agreement (${delta100 >= 0 ? `+${delta100}` : delta100} pts) — my stay matched Market Odds`
        : `Tight agreement (${delta100 >= 0 ? `+${delta100}` : delta100} pts) — ${criticName} & real guests agree`;
    } else if (delta100 > 5) {
      headline = firstHand
        ? `I rated this +${delta100} pts higher than Market Odds`
        : `${criticName} rated this +${delta100} pts higher than real guests`;
    } else {
      headline = firstHand
        ? `I rated this ${delta100} pts stricter than Market Odds — see what held it back`
        : `Real guests rated this +${Math.abs(delta100)} pts higher than ${criticName}`;
    }
  }

  const opinionGap: OpinionGapModel = {
    mode: firstHand ? 'my_vs_guests' : 'critics_vs_guests',
    title: firstHand ? 'Founder vs. Market Odds' : 'Published Critics vs. Real Guests',
    leftLabel: firstHand
      ? 'My First-Hand Stay'
      : scoredEditorial.length === 1 && primaryCritic
      ? primaryCritic.sourceName
      : scoredEditorial.length === 0 && unverifiedEditorial.length === 1
      ? unverifiedEditorial[0].sourceName
      : 'Published Critics',
    left100,
    leftDisplay: firstHand
      ? personalScoreLabel || `${hotel.overall} / 5`
      : scoredEditorial.length === 1 && primaryCritic
      ? primaryCritic.rawScore || `${critic100} / 100`
      : critic100 != null
      ? `${critic100} / 100`
      : unverifiedEditorial.length > 0
      ? 'Score awarded — unverified'
      : 'No critic score',
    rightLabel: firstHand ? 'Market Odds' : verifiedGuest ? verifiedGuest.sourceName : 'Real Guest Score',
    right100,
    rightDisplay: firstHand
      ? marketOdds != null
        ? `${marketOdds}%`
        : 'Live Google'
      : verifiedGuest
      ? `${verifiedGuest.rating.toFixed(1)} / ${verifiedGuest.scale}`
      : 'Live Google',
    delta100,
    deltaLabel: delta100 != null ? `${delta100 > 0 ? '+' : ''}${delta100} pts` : 'Live',
    headline,
    narrative: firstHand ? hotel.whereWeDiffer || hotel.verdict || '' : hotel.standout || '',
  };

  const isFullUnscored = visited && !firstHand && hotel.coverageType !== 'Short Tour';
  return {
    tier: firstHand ? 'first_hand_verified' : visited ? 'short_preview' : 'global_directory',
    tierLabel: firstHand
      ? 'Verified StayOdds'
      : isFullUnscored
      ? 'Filmed Stay'
      : visited
      ? 'Short Tour'
      : 'Market Odds',
    scoreTrack,
    scoreTrackLabel,
    firstHand,
    visited,
    personalScore25,
    personalScoreMax,
    personalScoreLabel,
    ours100,
    critic100,
    guest100,
    marketOdds,
    marketSourceCount,
    founderVsMarketDelta,
    founderVsMarketLabel,
    overallIndex,
    greatStayOdds,
    spread100,
    sourceCount,
    isConsensusBadge,
    statusBadge,
    statusTone,
    weights,
    formulaSummary,
    equationSummary,
    opinionGap,
    keyFacts,
    redFlags,
    editorialRatings,
    unverifiedEditorial,
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

