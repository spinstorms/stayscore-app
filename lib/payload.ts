/**
 * Builds the app's hotel list from the raw StayOdds tables. Pure (no React Native imports), so the
 * same code runs on the phone and in scripts/snapshot-data.mjs, which prepares the bundled copy
 * at build time; the phone then has nothing to work out on first launch.
 */
import { BRAND } from './brand';
import { PLACEHOLDER_IDS } from './placeholders';
import type { AffiliateDeal, Hotel, VideoItem } from './types';

const LIVE_BASE_URL = BRAND.liveApiBaseUrl;

export function resolveHotelThumbnail(id: string, rawHero?: string | null): string {
  const hero = String(rawHero || '').trim();
  const isBlocked =
    !hero ||
    hero.includes('www.fourseasons.com') ||
    hero.includes('www.lungarnocollection.com') ||
    hero.endsWith('/logo.jpg');
  const ownPlaceholder = PLACEHOLDER_IDS.has(id)
    ? `${LIVE_BASE_URL}/assets/placeholders/${id}.webp?v=169`
    : `${LIVE_BASE_URL}/assets/placeholders/default-stayodds.webp?v=169`;
  const missingPlaceholder = /\/assets\/placeholders\/([^/?]+)\.webp/.exec(hero);
  if (missingPlaceholder && !PLACEHOLDER_IDS.has(missingPlaceholder[1])) return ownPlaceholder;
  if (!isBlocked && /^https?:\/\//i.test(hero)) {
    return hero.includes('uncharteditinerary.com/assets/') && !hero.includes('?') ? `${hero}?v=169` : hero;
  }
  if (!isBlocked && hero.startsWith('assets/')) return `${LIVE_BASE_URL}/${hero}?v=169`;
  return ownPlaceholder;
}

function photoCreditFrom(src: unknown, thumb: string): { text: string; url: string } | null {
  if (typeof src !== 'string' || !src.startsWith('wikimedia|') || !/^https?:/i.test(thumb)) return null;
  const [, lic = '', artist = '', page = ''] = src.split('|');
  const text = `Photo: ${artist.trim() || 'Wikimedia Commons'}${lic.trim() ? `, ${lic.trim()}` : ''} via Wikimedia Commons`;
  return { text, url: page.trim() };
}

export type SavedRating = { r: number; n?: number | null; d?: string | null; u?: string | null };

/**
 * One guest score from every real guest rating, weighted by review count: exactly the website's
 * combined_guest_score(). Booking guests out of 10; Tripadvisor and Google (saved copies) out of 5.
 */
function combineGuestScores(gs?: Record<string, any> | null, ta?: SavedRating | null, gg?: SavedRating | null): Hotel['verifiedGuest'] {
  const parts: { name: string; rating: number; scale: number; normalized100: number; reviewCount: number | null; verifiedAt?: string; url?: string }[] = [];
  if (gs && gs.normalized_100 != null) {
    parts.push({
      name: 'Verified booking guests',
      rating: Number(gs.rating),
      scale: Number(gs.scale || 10),
      normalized100: Math.trunc(Number(gs.normalized_100)),
      reviewCount: gs.review_count != null ? Number(gs.review_count) : null,
      verifiedAt: gs.verified_at || undefined,
    });
  }
  if (ta && ta.r != null && (ta.n || 0) >= 20) {
    parts.push({ name: 'Tripadvisor', rating: Number(ta.r), scale: 5, normalized100: pyRound(Number(ta.r) * 20), reviewCount: Number(ta.n), verifiedAt: ta.d || undefined, url: ta.u || undefined });
  }
  if (gg && gg.r != null && (gg.n || 0) >= 20) {
    parts.push({ name: 'Google', rating: Number(gg.r), scale: 5, normalized100: pyRound(Number(gg.r) * 20), reviewCount: Number(gg.n), verifiedAt: gg.d || undefined });
  }
  if (!parts.length) return null;
  const counts = parts.map((p) => p.reviewCount || 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const n100 = total
    ? pyRound(parts.reduce((a, p, i) => a + p.normalized100 * counts[i], 0) / total)
    : pyRound(parts.reduce((a, p) => a + p.normalized100, 0) / parts.length);
  return {
    licensed: {
      sourceName: parts.length > 1 ? 'Guest Reviews' : parts[0].name,
      rating: pyRound(n100) / 10,
      scale: 10,
      normalized100: n100,
      reviewCount: total || null,
      attribution: parts.map((p) => p.name).join(' + '),
      verifiedAt: parts.map((p) => p.verifiedAt || '').sort().pop() || null,
      sources: parts,
    },
  } as Hotel['verifiedGuest'];
}

/** Python's round(): halves go to the even number, so the app and the website round the same way. */
function pyRound(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}

export interface StayOddsPayload {
  hotels: Hotel[];
  visitedCount: number;
  worldCount: number;
  videos: VideoItem[];
  shorts: VideoItem[];
  deals: AffiliateDeal[];
  updatedAt: string;
}

/** The raw tables and site files the directory is built from. Also the shape of the bundled snapshot. */
export interface RawDirectory {
  props: Record<string, any>[];
  facts: Record<string, any>[];
  fhReviews: Record<string, any>[];
  licensedScores: Record<string, any>[];
  awards: Record<string, any>[];
  editorial: Record<string, any>[];
  ytReviews: Record<string, any>[];
  bookingLinks: Record<string, any>[];
  videosRes: { videos?: VideoItem[]; shorts?: VideoItem[] };
  affRes: { curated?: AffiliateDeal[]; fromVideos?: AffiliateDeal[] };
  snapshotAt?: string;
  /** saved Tripadvisor and Google ratings, the same copies stayodds.com uses */
  savedRatings?: { tripadvisor?: Record<string, SavedRating>; google?: Record<string, SavedRating> };
}

/** Turns the raw tables into the app's hotel list. Pure and fast: also used for the bundled snapshot. */
export function buildPayload(raw: RawDirectory): StayOddsPayload {
  const { props, facts, fhReviews, licensedScores, awards, editorial, ytReviews, bookingLinks, videosRes, affRes } = raw;

  const factMap = new Map(facts.map((r) => [String(r.property_id), r]));
  const fhMap = new Map(fhReviews.map((r) => [String(r.property_id), r]));
  // A guest rating needs at least 20 reviews; thinner ones are left off. A hotel can have several
  // (booking-platform guests out of 10, Tripadvisor out of 5): they are combined below, weighted by review count.
  // Same rule as stayodds.com (build_stayodds_site.py): Tripadvisor and Google come from the saved
  // rating files, not the database rows; one booking-guest row per hotel, with 20+ reviews.
  const guestMap = new Map<string, Record<string, any>>();
  licensedScores
    .filter((r) => r.partner_source !== 'tripadvisor' && r.partner_source !== 'google')
    .filter((r) => (r.review_count != null ? Number(r.review_count) >= 20 : r.partner_source !== 'nuitee_connect'))
    .forEach((r) => guestMap.set(String(r.property_id), r));
  const savedTa = raw.savedRatings?.tripadvisor || {};
  const savedGoogle = raw.savedRatings?.google || {};

  const awardsMap = new Map<string, any[]>();
  awards.forEach((r) => {
    const k = String(r.property_id);
    awardsMap.set(k, [
      ...(awardsMap.get(k) || []),
      {
        awardBody: r.award_body,
        label: r.label,
        year: r.award_year,
        normalized100: r.normalized_100,
        sourceUrl: r.source_url,
      },
    ]);
  });

  const edMap = new Map<string, any[]>();
  editorial.forEach((r) => {
    const k = String(r.property_id);
    edMap.set(k, [
      ...(edMap.get(k) || []),
      {
        sourceName: r.source_name,
        sourceUrl: r.source_url,
        rawScore: r.raw_score,
        normalized100: r.normalized_100,
        takeaway: r.takeaway,
      },
    ]);
  });

  const ytMap = new Map<string, any[]>();
  ytReviews.forEach((r) => {
    const k = String(r.property_id);
    ytMap.set(k, [
      ...(ytMap.get(k) || []),
      {
        creatorName: r.creator_name,
        sourceUrl: r.source_url,
        sentiment: r.sentiment,
        takeaway: r.takeaway,
      },
    ]);
  });

  const bkMap = new Map<string, any[]>();
  bookingLinks.forEach((r) => {
    const k = String(r.property_id);
    bkMap.set(k, [
      ...(bkMap.get(k) || []),
      {
        channelType: r.channel_type,
        partnerName: r.partner_name,
        url: r.url,
        mobileAllowed: Boolean(r.mobile_allowed),
        perksSummary: r.perks_summary,
        priority: r.priority,
      },
    ]);
  });

  const hotels: Hotel[] = props.map((p) => {
    const id = String(p.id);
    const f = factMap.get(id) || {};
    const fh = fhMap.get(id);
    const gs = guestMap.get(id);
    const links = (bkMap.get(id) || []).sort((a, b) => (a.priority || 1) - (b.priority || 1));
    // Mobile Booking Compliance: prefer mobileAllowed link (StayOdds SEO web page or VIP/mobile-approved partner)
    const mobileBooking =
      links.find((l) => l.mobileAllowed)?.url || `${LIVE_BASE_URL}/stayodds/${id}/`;

    const rated = Boolean(fh && fh.overall_score != null);
    return {
      id,
      name: String(p.name || ''),
      location: String(p.city || ''),
      country: String(p.country || ''),
      region: String(p.region || 'Global'),
      lat: Number(p.lat || 0),
      lng: Number(p.lng || 0),
      brand: String(p.brand || ''),
      priceRange: p.price_tier || undefined,
      reviewedDate: fh?.reviewed_date || undefined,
      videoId: fh?.youtube_video_id || undefined,
      inLiveFeed: Boolean(fh?.in_live_feed),
      visitedByUs: Boolean(p.visited_by_founder),
      coverageType: fh?.coverage_type || 'Global Directory',
      tier: p.tier || 'global_directory',
      googlePlaceId: p.google_place_id || null,
      thumbnail: resolveHotelThumbnail(id, p.hero_image_url),
      photoCredit: photoCreditFrom(p.image_license_source, resolveHotelThumbnail(id, p.hero_image_url)),
      scores: rated && fh
        ? {
            rooms: fh.rooms_score != null ? Number(fh.rooms_score) : null,
            grounds: fh.grounds_score != null ? Number(fh.grounds_score) : null,
            food: fh.food_score != null ? Number(fh.food_score) : null,
            service: fh.service_score != null ? Number(fh.service_score) : null,
            value: fh.value_score != null ? Number(fh.value_score) : null,
          }
        : null,
      overall: rated && fh ? Number(fh.overall_score) : null,
      verdict: String(fh?.verdict || ''),
      whereWeDiffer: String(fh?.where_we_differ || ''),
      standout: String(f.standout || ''),
      watchOut: String(f.watch_out || ''),
      keyFacts: {
        poolHeating: f.pool_heating || undefined,
        beachOrReef: f.beach_or_reef || undefined,
        renovationYear: f.renovation_year || null,
        transferLogistics: f.transfer_logistics || undefined,
      },
      propertyStatus:
        f.operating_status || f.renovations_extensions || f.nearby_construction
          ? {
              operatingStatus: f.operating_status || undefined,
              renovationsExtensions: f.renovations_extensions || undefined,
              nearbyConstruction: f.nearby_construction || undefined,
              sourceUrl: f.status_source_url || undefined,
              sourceNote: f.status_source_note || undefined,
              verifiedAt: f.status_verified_at || undefined,
            }
          : null,
      redFlags: Array.isArray(f.red_flag_tags) ? f.red_flag_tags : [],
      bookingUrl: mobileBooking,
      bookingLinks: links,
      shorts: Array.isArray(fh?.shorts) ? fh.shorts : [],
      verifiedGuest: combineGuestScores(gs, savedTa[id], savedGoogle[id]),
      editorialRatings: edMap.get(id) || [],
      youtubeReviews: ytMap.get(id) || [],
      officialAwards: awardsMap.get(id) || [],
    };
  });

  const visitedCount = hotels.filter((h) => h.visitedByUs).length;
  const payload: StayOddsPayload = {
    hotels,
    visitedCount,
    worldCount: hotels.length - visitedCount,
    videos: videosRes.videos || [],
    shorts: videosRes.shorts || [],
    deals: [...(affRes.curated || []), ...(affRes.fromVideos || [])],
    updatedAt: raw.snapshotAt || new Date().toISOString(),
  };
  return payload;
}
